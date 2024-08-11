import { TransactionResponse, VerifiableCredential, VPToken } from './response'
import { PresentedCredential } from './presentedCredential'
import { CustomError } from '../ErrorService'
import jsonpath from 'jsonpath'
import { PresentationDefinition } from '../PresentationDefinitionController'
import { DIDResolver } from '../DIDService'
import axios from 'axios'
import { verify, purposes } from 'jsonld-signatures'
import {
    BbsBlsSignatureProof2020,
    Bls12381G2KeyPair,
} from '@mattrglobal/jsonld-signatures-bbs'
import { documentLoader } from '../DIDService/documentLoader'

// Interface defining the structure of a DID Document
interface DIDDocument {
    '@context': string[]
    id: string
    verificationMethod: VerificationMethod[]
}

// Interface defining the structure of a verification method
interface VerificationMethod {
    id: string
    type: string
    controller: string
    publicKeyPem: string
}

/**
 * Verifies a Verifiable Presentation token
 * @param vp_token The Verifiable Presentation token to verify
 */
export async function verifyPresentation(vp_token: VPToken) {
    // Check the proof type is 'BbsBlsSignature2020'
    if (vp_token.proof.type !== 'BbsBlsSignature2020') {
        throw new CustomError('Invalid proof type', 400)
    }

    // Verify the Verifiable Presentation
    const vpVerificationResult = await verify(vp_token, {
        suite: new BbsBlsSignatureProof2020(),
        purpose: new purposes.AssertionProofPurpose(),
        documentLoader: documentLoader,
    })

    if (!vpVerificationResult.verified) {
        throw new CustomError(
            `Verifiable Presentation is invalid ${vpVerificationResult.error}`,
            400
        )
    }
}

/**
 * Verifies a Verifiable Credential
 * @param vc The Verifiable Credential to verify
 */
export async function verifyCredentials(vc: VerifiableCredential) {
    // Check the proof type is 'BbsBlsSignature2020'
    if (vc.proof.type !== 'BbsBlsSignature2020') {
        throw new CustomError('Invalid proof type', 400)
    }

    // Verify the signature on the VC
    const vcVerificationResult = await verify(vc, {
        suite: new BbsBlsSignatureProof2020(),
        purpose: new purposes.AssertionProofPurpose(),
        documentLoader: documentLoader,
    })

    if (!vcVerificationResult.verified) {
        throw new CustomError(
            `Verifiable Presentation is invalid ${vcVerificationResult.error}`,
            400
        )
    }

    // Check if the credential has expired
    if (vc.expirationDate.getTime() - Date.now() < 0) {
        throw new CustomError('Credential has expired', 400)
    }
}

/**
 * Verifies a Presentation Submission against a Presentation Definition
 * @param res The Transaction Response containing the Presentation Submission
 * @param pd The Presentation Definition to verify against
 * @returns An array of PresentedCredential objects
 */
export function verifyPresentationSubmission(
    res: TransactionResponse,
    pd: PresentationDefinition
): PresentedCredential[] {
    let presentedCredentials: PresentedCredential[] = []

    // Create sets of required and submitted descriptor IDs
    const requiredDescriptorIds = new Set(
        pd.input_descriptors.map((descriptor) => descriptor.id)
    )
    const submittedDescriptorIds = new Set(
        res.presentation_submission.descriptor_map.map(
            (descriptor) => descriptor.id
        )
    )

    // Check if all required descriptors are present in the submission
    for (const requiredId of requiredDescriptorIds) {
        if (!submittedDescriptorIds.has(requiredId)) {
            throw new CustomError(
                `Missing required credential descriptor: ${requiredId}`,
                400
            )
        }
    }

    // Verify each submitted descriptor against the corresponding input descriptor
    for (const submittedDescriptor of res.presentation_submission
        .descriptor_map) {
        const inputDescriptor = pd.input_descriptors.find(
            (descriptor) => descriptor.id === submittedDescriptor.id
        )

        // Check for unexpected descriptors (selective disclosure)
        if (!inputDescriptor) {
            throw new CustomError(
                `Unexpected descriptor in submission: ${submittedDescriptor.id}`,
                400
            )
        }

        // Verify the format of the submitted descriptor
        if (submittedDescriptor.format !== 'ldp_vp') {
            throw new CustomError(
                `descriptor ${submittedDescriptor.id}: ${submittedDescriptor.format} not ldp_vp`,
                400
            )
        }

        // Check if the vp token contains the submission
        let submissionObject = jsonpath.value(
            res.vp_token,
            submittedDescriptor.path_nested.path.replace(/^\$(?!\[)/, '$[0]')
        ) as VerifiableCredential
        if (!submissionObject) {
            throw new CustomError(
                `Presentation Token does not match submission ${submittedDescriptor.path_nested.path}`,
                400
            )
        }

        console.log(submissionObject)

        // Verify constraints for each field in the input descriptor
        for (const field of inputDescriptor.constraints.fields) {
            let fieldObject = jsonpath.value(submissionObject, field.path[0])

            // Check if the path exists in the submitted descriptor
            if (!fieldObject) {
                throw new CustomError(
                    `Submission missing field ${field.path[0]}`,
                    400
                )
            }

            // Check if filter matches (if present)
            if (field.filter) {
                const regex = new RegExp(field.filter.pattern)

                if (typeof fieldObject !== field.filter.type) {
                    throw new CustomError(
                        `Field ${field.path[0]} is not of type ${field.filter.type}`,
                        400
                    )
                }

                if (!regex.test(fieldObject)) {
                    throw new CustomError(
                        `Field ${field.path[0]} does not match filter ${field.filter.pattern}`,
                        400
                    )
                }
            }

            // Add valid field to the list of presented credentials
            let submission = new PresentedCredential(
                submittedDescriptor.id,
                field.path[0],
                fieldObject,
                submissionObject.issuer.id
            )
            presentedCredentials.push(submission)
        }
    }

    return presentedCredentials
}
