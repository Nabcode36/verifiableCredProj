import {
    verifyPresentation,
    verifyCredentials,
    verifyPresentationSubmission
} from '../../src/services/TransactionController/verificationService';
import {
    VPToken,
    VerifiableCredential,
    TransactionResponse,
    PresentedCredential
} from '../../src/services/TransactionController';
import { PresentationDefinition } from '../../src/services/PresentationDefinitionController';
import { CustomError } from '../../src/services/ErrorService';

// Mock the external dependencies
jest.mock('jsonld-signatures');
jest.mock('@mattrglobal/jsonld-signatures-bbs');
jest.mock('../../src/services/DIDService/documentLoader');

describe('Verification Service', () => {
    describe('verifyPresentation', () => {
        it('should verify a valid presentation', async () => {
            const mockVPToken: VPToken = {
                "@context": ["https://www.w3.org/2018/credentials/v1"],
                type: ["VerifiablePresentation"],
                verifiableCredential: [],
                id: "urn:uuid:1234",
                holder: "did:example:holder",
                proof: {
                    type: "BbsBlsSignature2020",
                    created: "2023-01-01T00:00:00Z",
                    proofPurpose: "authentication",
                    verificationMethod: "did:example:123#key-1",
                    proofValue: "validProofValue",
                    challenge: "1234567890"
                }
            };

            const mockVerify = jest.requireMock('jsonld-signatures').verify;
            mockVerify.mockResolvedValue({ verified: true });

            await expect(verifyPresentation(mockVPToken)).resolves.not.toThrow();
        });

        it('should throw an error for an invalid proof type', async () => {
            const mockVPToken: VPToken = {
                "@context": ["https://www.w3.org/2018/credentials/v1"],
                type: ["VerifiablePresentation"],
                verifiableCredential: [],
                id: "urn:uuid:1234",
                holder: "did:example:holder",
                proof: {
                    type: "InvalidProofType",
                    created: "2023-01-01T00:00:00Z",
                    proofPurpose: "authentication",
                    verificationMethod: "did:example:123#key-1",
                    proofValue: "invalidProofValue",
                    challenge: "1234567890"
                }
            };

            await expect(verifyPresentation(mockVPToken)).rejects.toThrow(CustomError);
        });

        it('should throw an error for an invalid presentation', async () => {
            const mockVPToken: VPToken = {
                "@context": ["https://www.w3.org/2018/credentials/v1"],
                type: ["VerifiablePresentation"],
                verifiableCredential: [],
                id: "urn:uuid:1234",
                holder: "did:example:holder",
                proof: {
                    type: "BbsBlsSignature2020",
                    created: "2023-01-01T00:00:00Z",
                    proofPurpose: "authentication",
                    verificationMethod: "did:example:123#key-1",
                    proofValue: "invalidProofValue",
                    challenge: "1234567890"
                }
            };

            const mockVerify = jest.requireMock('jsonld-signatures').verify;
            mockVerify.mockResolvedValue({ verified: false, error: "Invalid signature" });

            await expect(verifyPresentation(mockVPToken)).rejects.toThrow(CustomError);
        });

        it('should handle a presentation with multiple credentials', async () => {
            const mockVPToken: VPToken = {
                "@context": ["https://www.w3.org/2018/credentials/v1"],
                type: ["VerifiablePresentation"],
                verifiableCredential: [
                    {
                        "@context": ["https://www.w3.org/2018/credentials/v1"],
                        id: "http://example.edu/credentials/1872",
                        type: ["VerifiableCredential"],
                        issuer: { id: "did:example:123" },
                        credentialSubject: { id: "did:example:456" },
                        proof: {
                            type: "BbsBlsSignature2020",
                            created: "2023-01-01T00:00:00Z",
                            proofPurpose: "assertionMethod",
                            verificationMethod: "did:example:123#key-1",
                            proofValue: "validProofValue",
                            challenge: "1234567890"
                        },
                        expirationDate: new Date("2030-01-01T00:00:00Z")
                    },
                    {
                        "@context": ["https://www.w3.org/2018/credentials/v1"],
                        id: "http://example.edu/credentials/1873",
                        type: ["VerifiableCredential"],
                        issuer: { id: "did:example:124" },
                        credentialSubject: { id: "did:example:456" },
                        proof: {
                            type: "BbsBlsSignature2020",
                            created: "2023-01-01T00:00:00Z",
                            proofPurpose: "assertionMethod",
                            verificationMethod: "did:example:124#key-1",
                            proofValue: "validProofValue",
                            challenge: "1234567890"
                        },
                        expirationDate: new Date("2030-01-01T00:00:00Z")
                    }
                ],
                id: "urn:uuid:1234",
                holder: "did:example:holder",
                proof: {
                    type: "BbsBlsSignature2020",
                    created: "2023-01-01T00:00:00Z",
                    proofPurpose: "authentication",
                    verificationMethod: "did:example:123#key-1",
                    proofValue: "validProofValue",
                    challenge: "1234567890"
                }
            };

            const mockVerify = jest.requireMock('jsonld-signatures').verify;
            mockVerify.mockResolvedValue({ verified: true });

            await expect(verifyPresentation(mockVPToken)).resolves.not.toThrow();
        });
    });

    describe('verifyCredentials', () => {
        it('should verify a valid credential', async () => {
            const mockVC: VerifiableCredential = {
                "@context": ["https://www.w3.org/2018/credentials/v1"],
                id: "http://example.edu/credentials/1872",
                type: ["VerifiableCredential"],
                issuer: { id: "did:example:123" },
                credentialSubject: {
                    id: "did:example:456",
                    degree: {
                        type: "BachelorDegree",
                        name: "Bachelor of Science and Arts"
                    }
                },
                proof: {
                    type: "BbsBlsSignature2020",
                    created: "2023-01-01T00:00:00Z",
                    proofPurpose: "assertionMethod",
                    verificationMethod: "did:example:123#key-1",
                    proofValue: "validProofValue",
                    challenge: "1234567890"
                },
                expirationDate: new Date("2030-01-01T00:00:00Z")
            };

            const mockVerify = jest.requireMock('jsonld-signatures').verify;
            mockVerify.mockResolvedValue({ verified: true });

            await expect(verifyCredentials(mockVC)).resolves.not.toThrow();
        });

        it('should throw an error for an invalid proof type', async () => {
            const mockVC: VerifiableCredential = {
                "@context": ["https://www.w3.org/2018/credentials/v1"],
                id: "http://example.edu/credentials/1872",
                type: ["VerifiableCredential"],
                issuer: { id: "did:example:123" },
                credentialSubject: {
                    id: "did:example:456",
                    degree: {
                        type: "BachelorDegree",
                        name: "Bachelor of Science and Arts"
                    }
                },
                proof: {
                    type: "InvalidProofType",
                    created: "2023-01-01T00:00:00Z",
                    proofPurpose: "assertionMethod",
                    verificationMethod: "did:example:123#key-1",
                    proofValue: "invalidProofValue",
                    challenge: "1234567890"
                },
                expirationDate: new Date("2030-01-01T00:00:00Z")
            };

            await expect(verifyCredentials(mockVC)).rejects.toThrow(CustomError);
        });

        it('should throw an error for an expired credential', async () => {
            const mockVC: VerifiableCredential = {
                "@context": ["https://www.w3.org/2018/credentials/v1"],
                id: "http://example.edu/credentials/1872",
                type: ["VerifiableCredential"],
                issuer: { id: "did:example:123" },
                credentialSubject: {
                    id: "did:example:456",
                    degree: {
                        type: "BachelorDegree",
                        name: "Bachelor of Science and Arts"
                    }
                },
                proof: {
                    type: "BbsBlsSignature2020",
                    created: "2023-01-01T00:00:00Z",
                    proofPurpose: "assertionMethod",
                    verificationMethod: "did:example:123#key-1",
                    proofValue: "validProofValue",
                    challenge: "1234567890"
                },
                expirationDate: new Date("2020-01-01T00:00:00Z")
            };

            const mockVerify = jest.requireMock('jsonld-signatures').verify;
            mockVerify.mockResolvedValue({ verified: true });

            await expect(verifyCredentials(mockVC)).rejects.toThrow(CustomError);
        });

        it('should throw an error for an invalid signature', async () => {
            const mockVC: VerifiableCredential = {
                "@context": ["https://www.w3.org/2018/credentials/v1"],
                id: "http://example.edu/credentials/1872",
                type: ["VerifiableCredential"],
                issuer: { id: "did:example:123" },
                credentialSubject: {
                    id: "did:example:456",
                    degree: {
                        type: "BachelorDegree",
                        name: "Bachelor of Science and Arts"
                    }
                },
                proof: {
                    type: "BbsBlsSignature2020",
                    created: "2023-01-01T00:00:00Z",
                    proofPurpose: "assertionMethod",
                    verificationMethod: "did:example:123#key-1",
                    proofValue: "invalidProofValue",
                    challenge: "1234567890"
                },
                expirationDate: new Date("2030-01-01T00:00:00Z")
            };

            const mockVerify = jest.requireMock('jsonld-signatures').verify;
            mockVerify.mockResolvedValue({ verified: false, error: "Invalid signature" });

            await expect(verifyCredentials(mockVC)).rejects.toThrow(CustomError);
        });
    });

    describe('verifyPresentationSubmission', () => {
        it('should verify a valid presentation submission', () => {
            const mockVPToken: VPToken = {
                "@context": ["https://www.w3.org/2018/credentials/v1"],
                type: ["VerifiablePresentation"],
                verifiableCredential: [{
                    "@context": ["https://www.w3.org/2018/credentials/v1"],
                    id: "http://example.edu/credentials/1872",
                    type: ["VerifiableCredential"],
                    issuer: { id: "did:example:123" },
                    credentialSubject: {
                        id: "did:example:456",
                        degree: {
                            type: "BachelorDegree",
                            name: "Bachelor of Science and Arts"
                        }
                    },
                    proof: {
                        type: "BbsBlsSignature2020",
                        created: "2023-01-01T00:00:00Z",
                        proofPurpose: "assertionMethod",
                        verificationMethod: "did:example:123#key-1",
                        proofValue: "validProofValue",
                        challenge: "1234567890"
                    },
                    expirationDate: new Date("2030-01-01T00:00:00Z")
                }],
                id: "urn:uuid:1234",
                holder: "did:example:holder",
                proof: {
                    type: "BbsBlsSignature2020",
                    created: "2023-01-01T00:00:00Z",
                    proofPurpose: "authentication",
                    verificationMethod: "did:example:123#key-1",
                    proofValue: "validProofValue",
                    challenge: "1234567890"
                }
            };

            const mockResponse: TransactionResponse = {
                vp_token: [mockVPToken],
                presentation_submission: {
                    id: "submission-1",
                    definition_id: "pd-1",
                    descriptor_map: [{
                        id: "degree",
                        format: "ldp_vp",
                        path: "$",
                        path_nested: {
                            format: "ldp_vc",
                            path: "$.verifiableCredential[0]"
                        }
                    }]
                },
                state: "state-1234"
            };

            const mockPD: PresentationDefinition = {
                "@context": ["https://www.w3.org/2018/credentials/v1"],
                id: "pd-1",
                format: {
                    ldp_vc: {
                        proof_type: ["BbsBlsSignature2020"]
                    }
                },
                input_descriptors: [{
                    id: "degree",
                    name: "Degree",
                    purpose: "We need your degree",
                    constraints: {
                        fields: [{
                            path: ["$.credentialSubject.degree.name"],
                            filter: {
                                type: "string",
                                pattern: "Bachelor"
                            }
                        }]
                    }
                }]
            };

            const result = verifyPresentationSubmission(mockResponse, mockPD);
            expect(result).toHaveLength(1);
            expect(result[0]).toBeInstanceOf(PresentedCredential);
            expect(result[0].cred).toBe("degree");
            expect(result[0].key).toBe("$.credentialSubject.degree.name");
            expect(result[0].value).toBe("Bachelor of Science and Arts");
            expect(result[0].issuer).toBe("did:example:123");
        });

        it('should throw an error for missing required descriptors', () => {
            const mockResponse: TransactionResponse = {
                vp_token: [],
                presentation_submission: {
                    id: "submission-1",
                    definition_id: "pd-1",
                    descriptor_map: []
                },
                state: "state-1234"
            };

            const mockPD: PresentationDefinition = {
                "@context": ["https://www.w3.org/2018/credentials/v1"],
                id: "pd-1",
                format: {
                    ldp_vc: {
                        proof_type: ["BbsBlsSignature2020"]
                    }
                },
                input_descriptors: [{
                    id: "degree",
                    name: "Degree",
                    purpose: "We need your degree",
                    constraints: {
                        fields: [{
                            path: ["$.credentialSubject.degree.name"],
                            filter: {
                                type: "string",
                                pattern: "Bachelor"
                            }
                        }]
                    }
                }]
            };

            expect(() => verifyPresentationSubmission(mockResponse, mockPD)).toThrow(CustomError);
        });

        it('should throw an error for unexpected descriptors', () => {
            const mockResponse: TransactionResponse = {
                vp_token: [],
                presentation_submission: {
                    id: "submission-1",
                    definition_id: "pd-1",
                    descriptor_map: [{
                        id: "unexpected",
                        format: "ldp_vp",
                        path: "$",
                        path_nested: {
                            format: "ldp_vc",
                            path: "$.verifiableCredential[0]"
                        }
                    }]
                },
                state: "state-1234"
            };

            const mockPD: PresentationDefinition = {
                "@context": ["https://www.w3.org/2018/credentials/v1"],
                id: "pd-1",
                format: {
                    ldp_vc: {
                        proof_type: ["BbsBlsSignature2020"]
                    }
                },
                input_descriptors: [{
                    id: "degree",
                    name: "Degree",
                    purpose: "We need your degree",
                    constraints: {
                        fields: [{
                            path: ["$.credentialSubject.degree.name"],
                            filter: {
                                type: "string",
                                pattern: "Bachelor"
                            }
                        }]
                    }
                }]
            };

            expect(() => verifyPresentationSubmission(mockResponse, mockPD)).toThrow(CustomError);
        });

        it('should handle multiple input descriptors', () => {
            const mockVPToken: VPToken = {
                "@context": ["https://www.w3.org/2018/credentials/v1"],
                type: ["VerifiablePresentation"],
                verifiableCredential: [
                    {
                        "@context": ["https://www.w3.org/2018/credentials/v1"],
                        id: "http://example.edu/credentials/1872",
                        type: ["VerifiableCredential"],
                        issuer: { id: "did:example:123" },
                        credentialSubject: {
                            id: "did:example:456",
                            degree: {
                                type: "BachelorDegree",
                                name: "Bachelor of Science and Arts"
                            }
                        },
                        proof: {
                            type: "BbsBlsSignature2020",
                            created: "2023-01-01T00:00:00Z",
                            proofPurpose: "assertionMethod",
                            verificationMethod: "did:example:123#key-1",
                            proofValue: "validProofValue",
                            challenge: "1234567890"
                        },
                        expirationDate: new Date("2030-01-01T00:00:00Z")
                    },
                    {
                        "@context": ["https://www.w3.org/2018/credentials/v1"],
                        id: "http://example.com/credentials/3732",
                        type: ["VerifiableCredential"],
                        issuer: { id: "did:example:456" },
                        credentialSubject: {
                            id: "did:example:456",
                            name: "Alice Smith"
                        },
                        proof: {
                            type: "BbsBlsSignature2020",
                            created: "2023-01-01T00:00:00Z",
                            proofPurpose: "assertionMethod",
                            verificationMethod: "did:example:456#key-1",
                            proofValue: "validProofValue",
                            challenge: "0987654321"
                        },
                        expirationDate: new Date("2030-01-01T00:00:00Z")
                    }
                ],
                id: "urn:uuid:1234",
                holder: "did:example:holder",
                proof: {
                    type: "BbsBlsSignature2020",
                    created: "2023-01-01T00:00:00Z",
                    proofPurpose: "authentication",
                    verificationMethod: "did:example:123#key-1",
                    proofValue: "validProofValue",
                    challenge: "1234567890"
                }
            };

            const mockResponse: TransactionResponse = {
                vp_token: [mockVPToken],
                presentation_submission: {
                    id: "submission-1",
                    definition_id: "pd-1",
                    descriptor_map: [
                        {
                            id: "degree",
                            format: "ldp_vp",
                            path: "$",
                            path_nested: {
                                format: "ldp_vc",
                                path: "$.verifiableCredential[0]"
                            }
                        },
                        {
                            id: "name",
                            format: "ldp_vp",
                            path: "$",
                            path_nested: {
                                format: "ldp_vc",
                                path: "$.verifiableCredential[1]"
                            }
                        }
                    ]
                },
                state: "state-1234"
            };

            const mockPD: PresentationDefinition = {
                "@context": ["https://www.w3.org/2018/credentials/v1"],
                id: "pd-1",
                format: {
                    ldp_vc: {
                        proof_type: ["BbsBlsSignature2020"]
                    }
                },
                input_descriptors: [
                    {
                        id: "degree",
                        name: "Degree",
                        purpose: "We need your degree",
                        constraints: {
                            fields: [{
                                path: ["$.credentialSubject.degree.name"],
                                filter: {
                                    type: "string",
                                    pattern: "Bachelor"
                                }
                            }]
                        }
                    },
                    {
                        id: "name",
                        name: "Name",
                        purpose: "We need your name",
                        constraints: {
                            fields: [{
                                path: ["$.credentialSubject.name"],
                                filter: {
                                    type: "string",
                                    pattern: ''
                                }
                            }]
                        }
                    }
                ]
            };

            const result = verifyPresentationSubmission(mockResponse, mockPD);
            expect(result).toHaveLength(2);
            expect(result[0]).toBeInstanceOf(PresentedCredential);
            expect(result[0].cred).toBe("degree");
            expect(result[0].key).toBe("$.credentialSubject.degree.name");
            expect(result[0].value).toBe("Bachelor of Science and Arts");
            expect(result[0].issuer).toBe("did:example:123");
            expect(result[1]).toBeInstanceOf(PresentedCredential);
            expect(result[1].cred).toBe("name");
            expect(result[1].key).toBe("$.credentialSubject.name");
            expect(result[1].value).toBe("Alice Smith");
            expect(result[1].issuer).toBe("did:example:456");
        });

        it('should throw an error when a required field is missing', () => {
            const mockVPToken: VPToken = {
                "@context": ["https://www.w3.org/2018/credentials/v1"],
                type: ["VerifiablePresentation"],
                verifiableCredential: [{
                    "@context": ["https://www.w3.org/2018/credentials/v1"],
                    id: "http://example.edu/credentials/1872",
                    type: ["VerifiableCredential"],
                    issuer: { id: "did:example:123" },
                    credentialSubject: {
                        id: "did:example:456",
                        // degree field is missing
                    },
                    proof: {
                        type: "BbsBlsSignature2020",
                        created: "2023-01-01T00:00:00Z",
                        proofPurpose: "assertionMethod",
                        verificationMethod: "did:example:123#key-1",
                        proofValue: "validProofValue",
                        challenge: "1234567890"
                    },
                    expirationDate: new Date("2030-01-01T00:00:00Z")
                }],
                id: "urn:uuid:1234",
                holder: "did:example:holder",
                proof: {
                    type: "BbsBlsSignature2020",
                    created: "2023-01-01T00:00:00Z",
                    proofPurpose: "authentication",
                    verificationMethod: "did:example:123#key-1",
                    proofValue: "validProofValue",
                    challenge: "1234567890"
                }
            };

            const mockResponse: TransactionResponse = {
                vp_token: [mockVPToken],
                presentation_submission: {
                    id: "submission-1",
                    definition_id: "pd-1",
                    descriptor_map: [{
                        id: "degree",
                        format: "ldp_vp",
                        path: "$",
                        path_nested: {
                            format: "ldp_vc",
                            path: "$.verifiableCredential[0]"
                        }
                    }]
                },
                state: "state-1234"
            };

            const mockPD: PresentationDefinition = {
                "@context": ["https://www.w3.org/2018/credentials/v1"],
                id: "pd-1",
                format: {
                    ldp_vc: {
                        proof_type: ["BbsBlsSignature2020"]
                    }
                },
                input_descriptors: [{
                    id: "degree",
                    name: "Degree",
                    purpose: "We need your degree",
                    constraints: {
                        fields: [{
                            path: ["$.credentialSubject.degree.name"],
                            filter: {
                                type: "string",
                                pattern: "Bachelor"
                            }
                        }]
                    }
                }]
            };

            expect(() => verifyPresentationSubmission(mockResponse, mockPD)).toThrow(CustomError);
        });

        it('should throw an error when a field does not match the filter', () => {
            const mockVPToken: VPToken = {
                "@context": ["https://www.w3.org/2018/credentials/v1"],
                type: ["VerifiablePresentation"],
                verifiableCredential: [{
                    "@context": ["https://www.w3.org/2018/credentials/v1"],
                    id: "http://example.edu/credentials/1872",
                    type: ["VerifiableCredential"],
                    issuer: { id: "did:example:123" },
                    credentialSubject: {
                        id: "did:example:456",
                        degree: {
                            type: "MasterDegree",
                            name: "Master of Science"
                        }
                    },
                    proof: {
                        type: "BbsBlsSignature2020",
                        created: "2023-01-01T00:00:00Z",
                        proofPurpose: "assertionMethod",
                        verificationMethod: "did:example:123#key-1",
                        proofValue: "validProofValue",
                        challenge: "1234567890"
                    },
                    expirationDate: new Date("2030-01-01T00:00:00Z")
                }],
                id: "urn:uuid:1234",
                holder: "did:example:holder",
                proof: {
                    type: "BbsBlsSignature2020",
                    created: "2023-01-01T00:00:00Z",
                    proofPurpose: "authentication",
                    verificationMethod: "did:example:123#key-1",
                    proofValue: "validProofValue",
                    challenge: "1234567890"
                }
            };

            const mockResponse: TransactionResponse = {
                vp_token: [mockVPToken],
                presentation_submission: {
                    id: "submission-1",
                    definition_id: "pd-1",
                    descriptor_map: [{
                        id: "degree",
                        format: "ldp_vp",
                        path: "$",
                        path_nested: {
                            format: "ldp_vc",
                            path: "$.verifiableCredential[0]"
                        }
                    }]
                },
                state: "state-1234"
            };

            const mockPD: PresentationDefinition = {
                "@context": ["https://www.w3.org/2018/credentials/v1"],
                id: "pd-1",
                format: {
                    ldp_vc: {
                        proof_type: ["BbsBlsSignature2020"]
                    }
                },
                input_descriptors: [{
                    id: "degree",
                    name: "Degree",
                    purpose: "We need your degree",
                    constraints: {
                        fields: [{
                            path: ["$.credentialSubject.degree.name"],
                            filter: {
                                type: "string",
                                pattern: "Bachelor"
                            }
                        }]
                    }
                }]
            };

            expect(() => verifyPresentationSubmission(mockResponse, mockPD)).toThrow(CustomError);
        });

        it('should throw an error for a missing required descriptor', () => {
            const mockVPToken: VPToken = {
                "@context": ["https://www.w3.org/2018/credentials/v1"],
                type: ["VerifiablePresentation"],
                verifiableCredential: [{
                    "@context": ["https://www.w3.org/2018/credentials/v1"],
                    id: "http://example.edu/credentials/1872",
                    type: ["VerifiableCredential"],
                    issuer: { id: "did:example:123" },
                    credentialSubject: {
                        id: "did:example:456",
                        degree: {
                            type: "BachelorDegree",
                            name: "Bachelor of Science and Arts"
                        }
                    },
                    proof: {
                        type: "BbsBlsSignature2020",
                        created: "2023-01-01T00:00:00Z",
                        proofPurpose: "assertionMethod",
                        verificationMethod: "did:example:123#key-1",
                        proofValue: "validProofValue",
                        challenge: "1234567890"
                    },
                    expirationDate: new Date("2030-01-01T00:00:00Z")
                }],
                id: "urn:uuid:1234",
                holder: "did:example:holder",
                proof: {
                    type: "BbsBlsSignature2020",
                    created: "2023-01-01T00:00:00Z",
                    proofPurpose: "authentication",
                    verificationMethod: "did:example:123#key-1",
                    proofValue: "validProofValue",
                    challenge: "1234567890"
                }
            };

            const mockResponse: TransactionResponse = {
                vp_token: [mockVPToken],
                presentation_submission: {
                    id: "submission-1",
                    definition_id: "pd-1",
                    descriptor_map: [{
                        id: "unexpected_descriptor",
                        format: "ldp_vp",
                        path: "$",
                        path_nested: {
                            format: "ldp_vc",
                            path: "$.verifiableCredential[0]"
                        }
                    }]
                },
                state: "state-1234"
            };

            const mockPD: PresentationDefinition = {
                "@context": ["https://www.w3.org/2018/credentials/v1"],
                id: "pd-1",
                format: {
                    ldp_vc: {
                        proof_type: ["BbsBlsSignature2020"]
                    }
                },
                input_descriptors: [{
                    id: "degree",
                    name: "Degree",
                    purpose: "We need your degree",
                    constraints: {
                        fields: [{
                            path: ["$.credentialSubject.degree.name"],
                            filter: {
                                type: "string",
                                pattern: "Bachelor"
                            }
                        }]
                    }
                }]
            };

            expect(() => verifyPresentationSubmission(mockResponse, mockPD)).toThrow(
                new CustomError('Missing required credential descriptor: degree', 400)
            );
        });

        it('should throw an error for an unexpected descriptor', () => {
            const mockVPToken: VPToken = {
                "@context": ["https://www.w3.org/2018/credentials/v1"],
                type: ["VerifiablePresentation"],
                verifiableCredential: [{
                    "@context": ["https://www.w3.org/2018/credentials/v1"],
                    id: "http://example.edu/credentials/1872",
                    type: ["VerifiableCredential"],
                    issuer: { id: "did:example:123" },
                    credentialSubject: {
                        id: "did:example:456",
                        degree: {
                            type: "BachelorDegree",
                            name: "Bachelor of Science and Arts"
                        }
                    },
                    proof: {
                        type: "BbsBlsSignature2020",
                        created: "2023-01-01T00:00:00Z",
                        proofPurpose: "assertionMethod",
                        verificationMethod: "did:example:123#key-1",
                        proofValue: "validProofValue",
                        challenge: "1234567890"
                    },
                    expirationDate: new Date("2030-01-01T00:00:00Z")
                }],
                id: "urn:uuid:1234",
                holder: "did:example:holder",
                proof: {
                    type: "BbsBlsSignature2020",
                    created: "2023-01-01T00:00:00Z",
                    proofPurpose: "authentication",
                    verificationMethod: "did:example:123#key-1",
                    proofValue: "validProofValue",
                    challenge: "1234567890"
                }
            };

            const mockResponse: TransactionResponse = {
                vp_token: [mockVPToken],
                presentation_submission: {
                    id: "submission-1",
                    definition_id: "pd-1",
                    descriptor_map: [
                        {
                            id: "degree",
                            format: "ldp_vp",
                            path: "$",
                            path_nested: {
                                format: "ldp_vc",
                                path: "$.verifiableCredential[0]"
                            }
                        },
                        {
                            id: "unexpected_descriptor",
                            format: "ldp_vp",
                            path: "$",
                            path_nested: {
                                format: "ldp_vc",
                                path: "$.verifiableCredential[0]"
                            }
                        }
                    ]
                },
                state: "state-1234"
            };

            const mockPD: PresentationDefinition = {
                "@context": ["https://www.w3.org/2018/credentials/v1"],
                id: "pd-1",
                format: {
                    ldp_vc: {
                        proof_type: ["BbsBlsSignature2020"]
                    }
                },
                input_descriptors: [{
                    id: "degree",
                    name: "Degree",
                    purpose: "We need your degree",
                    constraints: {
                        fields: [{
                            path: ["$.credentialSubject.degree.name"],
                            filter: {
                                type: "string",
                                pattern: "Bachelor"
                            }
                        }]
                    }
                }]
            };

            expect(() => verifyPresentationSubmission(mockResponse, mockPD)).toThrow(
                new CustomError('Unexpected descriptor in submission: unexpected_descriptor', 400)
            );
        });

        it('should throw an error for an incorrect descriptor format', () => {
            const mockVPToken: VPToken = {
                "@context": ["https://www.w3.org/2018/credentials/v1"],
                type: ["VerifiablePresentation"],
                verifiableCredential: [{
                    "@context": ["https://www.w3.org/2018/credentials/v1"],
                    id: "http://example.edu/credentials/1872",
                    type: ["VerifiableCredential"],
                    issuer: { id: "did:example:123" },
                    credentialSubject: {
                        id: "did:example:456",
                        degree: {
                            type: "BachelorDegree",
                            name: "Bachelor of Science and Arts"
                        }
                    },
                    proof: {
                        type: "BbsBlsSignature2020",
                        created: "2023-01-01T00:00:00Z",
                        proofPurpose: "assertionMethod",
                        verificationMethod: "did:example:123#key-1",
                        proofValue: "validProofValue",
                        challenge: "1234567890"
                    },
                    expirationDate: new Date("2030-01-01T00:00:00Z")
                }],
                id: "urn:uuid:1234",
                holder: "did:example:holder",
                proof: {
                    type: "BbsBlsSignature2020",
                    created: "2023-01-01T00:00:00Z",
                    proofPurpose: "authentication",
                    verificationMethod: "did:example:123#key-1",
                    proofValue: "validProofValue",
                    challenge: "1234567890"
                }
            };

            const mockResponse: TransactionResponse = {
                vp_token: [mockVPToken],
                presentation_submission: {
                    id: "submission-1",
                    definition_id: "pd-1",
                    descriptor_map: [{
                        id: "degree",
                        format: "incorrect_format",
                        path: "$",
                        path_nested: {
                            format: "ldp_vc",
                            path: "$.verifiableCredential[0]"
                        }
                    }]
                },
                state: "state-1234"
            };

            const mockPD: PresentationDefinition = {
                "@context": ["https://www.w3.org/2018/credentials/v1"],
                id: "pd-1",
                format: {
                    ldp_vc: {
                        proof_type: ["BbsBlsSignature2020"]
                    }
                },
                input_descriptors: [{
                    id: "degree",
                    name: "Degree",
                    purpose: "We need your degree",
                    constraints: {
                        fields: [{
                            path: ["$.credentialSubject.degree.name"],
                            filter: {
                                type: "string",
                                pattern: "Bachelor"
                            }
                        }]
                    }
                }]
            };

            expect(() => verifyPresentationSubmission(mockResponse, mockPD)).toThrow(
                new CustomError('descriptor degree: incorrect_format not ldp_vp', 400)
            );
        });

        it('should throw an error when the Presentation Token does not match the submission', () => {
            const mockVPToken: VPToken = {
                "@context": ["https://www.w3.org/2018/credentials/v1"],
                type: ["VerifiablePresentation"],
                verifiableCredential: [],  // Empty credential array
                id: "urn:uuid:1234",
                holder: "did:example:holder",
                proof: {
                    type: "BbsBlsSignature2020",
                    created: "2023-01-01T00:00:00Z",
                    proofPurpose: "authentication",
                    verificationMethod: "did:example:123#key-1",
                    proofValue: "validProofValue",
                    challenge: "1234567890"
                }
            };

            const mockResponse: TransactionResponse = {
                vp_token: [mockVPToken],
                presentation_submission: {
                    id: "submission-1",
                    definition_id: "pd-1",
                    descriptor_map: [{
                        id: "degree",
                        format: "ldp_vp",
                        path: "$",
                        path_nested: {
                            format: "ldp_vc",
                            path: "$.verifiableCredential[0]"  // This path doesn't exist in the VP token
                        }
                    }]
                },
                state: "state-1234"
            };

            const mockPD: PresentationDefinition = {
                "@context": ["https://www.w3.org/2018/credentials/v1"],
                id: "pd-1",
                format: {
                    ldp_vc: {
                        proof_type: ["BbsBlsSignature2020"]
                    }
                },
                input_descriptors: [{
                    id: "degree",
                    name: "Degree",
                    purpose: "We need your degree",
                    constraints: {
                        fields: [{
                            path: ["$.credentialSubject.degree.name"],
                            filter: {
                                type: "string",
                                pattern: "Bachelor"
                            }
                        }]
                    }
                }]
            };

            expect(() => verifyPresentationSubmission(mockResponse, mockPD)).toThrow(
                new CustomError('Presentation Token does not match submission $.verifiableCredential[0]', 400)
            );
        });

        it('should throw an error when a field is not of the expected type', () => {
            const mockVPToken: VPToken = {
                "@context": ["https://www.w3.org/2018/credentials/v1"],
                type: ["VerifiablePresentation"],
                verifiableCredential: [{
                    "@context": ["https://www.w3.org/2018/credentials/v1"],
                    id: "http://example.edu/credentials/1872",
                    type: ["VerifiableCredential"],
                    issuer: { id: "did:example:123" },
                    credentialSubject: {
                        id: "did:example:456",
                        degree: {
                            type: "BachelorDegree",
                            name: 12345  // This should be a string, not a number
                        }
                    },
                    proof: {
                        type: "BbsBlsSignature2020",
                        created: "2023-01-01T00:00:00Z",
                        proofPurpose: "assertionMethod",
                        verificationMethod: "did:example:123#key-1",
                        proofValue: "validProofValue",
                        challenge: "1234567890"
                    },
                    expirationDate: new Date("2030-01-01T00:00:00Z")
                }],
                id: "urn:uuid:1234",
                holder: "did:example:holder",
                proof: {
                    type: "BbsBlsSignature2020",
                    created: "2023-01-01T00:00:00Z",
                    proofPurpose: "authentication",
                    verificationMethod: "did:example:123#key-1",
                    proofValue: "validProofValue",
                    challenge: "1234567890"
                }
            };

            const mockResponse: TransactionResponse = {
                vp_token: [mockVPToken],
                presentation_submission: {
                    id: "submission-1",
                    definition_id: "pd-1",
                    descriptor_map: [{
                        id: "degree",
                        format: "ldp_vp",
                        path: "$",
                        path_nested: {
                            format: "ldp_vc",
                            path: "$.verifiableCredential[0]"
                        }
                    }]
                },
                state: "state-1234"
            };

            const mockPD: PresentationDefinition = {
                "@context": ["https://www.w3.org/2018/credentials/v1"],
                id: "pd-1",
                format: {
                    ldp_vc: {
                        proof_type: ["BbsBlsSignature2020"]
                    }
                },
                input_descriptors: [{
                    id: "degree",
                    name: "Degree",
                    purpose: "We need your degree",
                    constraints: {
                        fields: [{
                            path: ["$.credentialSubject.degree.name"],
                            filter: {
                                type: "string",
                                pattern: ".*"
                            }
                        }]
                    }
                }]
            };

            expect(() => verifyPresentationSubmission(mockResponse, mockPD)).toThrow(
                new CustomError('Field $.credentialSubject.degree.name is not of type string', 400)
            );
        });
    });
});