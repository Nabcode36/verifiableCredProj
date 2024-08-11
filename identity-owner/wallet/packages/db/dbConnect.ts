import * as SQLite from 'expo-sqlite'

const db = SQLite.openDatabase('myDatabase.db')

// Initalise the Database Locally if it does not already exist
export const initializeDatabase = () => {
    db.transaction((tx) => {
        // Create DisplayCredential table
        tx.executeSql(
            `CREATE TABLE IF NOT EXISTS DisplayCredential (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          displayName TEXT NOT NULL,
          displayIcon TEXT NOT NULL,
          favourite TEXT NOT NULL,
          credentialId TEXT NOT NULL,
          FOREIGN KEY (credentialId) REFERENCES Credential (id)
        );`,
            [],
            () => {
                console.log('DisplayCredential Table created successfully')
            },
            (_, error) => {
                console.log('Error creating DisplayCredential table', error)
                return false
            }
        )

        // Create Credential table
        tx.executeSql(
            `CREATE TABLE IF NOT EXISTS Credential (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          context TEXT NOT NULL,
          type TEXT NOT NULL,
          issuer TEXT NOT NULL,
          name TEXT NOT NULL,
          credentialSubject TEXT NOT NULL,
          proof TEXT NOT NULL
        );`,
            [],
            () => {
                console.log('Credential Table created successfully')
            },
            (_, error) => {
                console.log('Error creating Credential table', error)
                return false
            }
        )
    })
}

// Create A Credential given the credential data
export const createCredential = (credentialData) => {
    db.transaction((tx) => {
        // Convert JSON fields to strings
        //credentialData = JSON.parse(credentialData);

        console.log('credentialData:', credentialData)
        const contextString = JSON.stringify(credentialData['@context'])
        console.log('contextString:', contextString)
        const typeString = JSON.stringify(credentialData.type)
        console.log('typeString:', typeString)
        const issuerString = JSON.stringify(credentialData.issuer)
        console.log('issuerString:', issuerString)
        const credentialSubjectString = JSON.stringify(
            credentialData.credentialSubject
        )
        console.log('credentialSubjectString:', credentialSubjectString)
        const proofString = JSON.stringify(credentialData.proof)
        console.log('proofString:', proofString)

        //console.log('Context String:', contextString);
        //console.log('Type String:', typeString);
        //console.log('Issuer String:', issuerString);
        //console.log('Credential Subject String:', credentialSubjectString);
        //console.log('Proof String:', proofString);

        tx.executeSql(
            `INSERT INTO Credential (context, type, issuer, name, credentialSubject, proof) VALUES (?, ?, ?, ?, ?, ?)`,
            [
                contextString,
                typeString,
                issuerString,
                credentialData.name,
                credentialSubjectString,
                proofString,
            ],
            (_, result) => {
                console.log(
                    'Credential inserted successfully, ID:',
                    result.insertId
                )

                // Insert into DisplayCredential table
                tx.executeSql(
                    `INSERT INTO DisplayCredential (displayName, displayIcon, favourite, credentialId) VALUES (?, ?, ?, ?)`,
                    [
                        credentialData.name,
                        '🔑', // Default display icon
                        'false', // Default favourite value
                        result.insertId, // Use the ID of the inserted credential
                    ],
                    (_, result) => {
                        console.log(
                            'DisplayCredential inserted successfully, ID:',
                            result.insertId
                        )
                    },
                    (_, error) => {
                        console.log('Error inserting DisplayCredential:', error)
                        return false
                    }
                )
            },
            (_, error) => {
                console.log('Error inserting credential:', error)
                return false
            }
        )
    })
}

// Get all of the values from the Display Credentials table
export const getAllDisplayCredentials = (callback) => {
    db.transaction((tx) => {
        tx.executeSql(
            'SELECT * FROM DisplayCredential;',
            [],
            (_, { rows }) => {
                callback(rows._array)
            },
            (_, error) => {
                console.log('Error fetching DisplayCredential', error)
                return false
            }
        )
    })
}

// Get all of the favourited Credentials From the the Display Crednetials Table
export const getFavDisplayCredentials = (callback) => {
    db.transaction((tx) => {
        tx.executeSql(
            'SELECT * FROM DisplayCredential WHERE favourite = ?;',
            ['true'],
            (_, { rows }) => {
                callback(rows._array)
            },
            (_, error) => {
                console.log('Error fetching DisplayCredential', error)
                return false
            }
        )
    })
}

// Get all credentials
export const getCredential = (callback) => {
    db.transaction((tx) => {
        tx.executeSql(
            'SELECT * FROM Credential;',
            [],
            (_, { rows }) => {
                // Return the parsed rows
                callback(rows)
            },
            (_, error) => {
                console.log('Error fetching Credential:', error)
                return false
            }
        )
    })
}

export const getCredentialid = (id, callback) => {
    db.transaction((tx) => {
        tx.executeSql(
            'SELECT * FROM Credential WHERE id = ?;',
            [id],
            (_, { rows }) => {
                // Return the parsed rows
                callback(rows)
            },
            (_, error) => {
                console.log('Error fetching Credential:', error)
                return false
            }
        )
    })
}

// Testing Function to ensure that the Construction of the queries works as expected
export const testCredentialSubject = () => {
    db.transaction((tx) => {
        tx.executeSql(
            `SELECT * FROM Credential WHERE json_extract(credentialSubject, '$.givenName') IS NOT NULL;`,
            [],
            (_, { rows }) => {
                const results = rows._array
                console.log(
                    'Credentials with matching credentialSubject $.givenName IS NOT NULL:',
                    results
                )
            },
            (_, error) => {
                console.log('Error fetching Credential:', error)
                return false
            }
        )
    })
}

// Testing function to test that the issuer search in the Construction of the queries works as expected
export const testIssuer = () => {
    db.transaction((tx) => {
        tx.executeSql(
            `SELECT * FROM Credential WHERE json_extract(issuer, '$.id') LIKE ?`,
            ['%did:web:issuer.com:3334:issuer:TEST DMV 3%'],
            (_, { rows }) => {
                const results = rows._array
                console.log('Credentials with matching issuer id:', results)
            },
            (_, error) => {
                console.log('Error fetching Credential:', error)
                return false
            }
        )
    })
}

// Given an array of objects which contain a path and filter, returns all credentials that have the field and data.
// returns false if there is no data in the field (or null?).
// (you can assume the filter always has type string).
// Example:
// Field 1:
// path: "$.credentialSubject.hasCredential.recognizedBy.name", filter.pattern: "UNSW"
// Field 2:
// path: "$.issuer.id", filter.pattern: "did:web:www.unsw.edu.au"

interface Field {
    path: string
    filter?: {
        type: string
        pattern: string
    }
}

export const getCredentialField = (
    fields: Field[],
    callback: (result: any[] | false) => void
) => {
    db.transaction((tx) => {
        // Construct the SQL queries based on fields
        const queries = fields.map((field) => {
            console.log('field: ', field)
            const path = field.path[0].slice(2)
            console.log('path: ', path)
            // Determine the root for the JSON path
            const [root, ...rest] = path.split('.')
            const jsonPath = rest.map((part) => `.${part}`).join('')

            // Check if the field has a filter pattern
            if (field.filter?.pattern) {
                return `json_extract(${root}, '$${jsonPath}') LIKE ?`
            } else {
                return `json_extract(${root}, '$${jsonPath}') IS NOT NULL`
            }
        })

        // Combine all conditions with AND
        const queryCondition = queries.join(' AND ')
        const patterns = fields
            .filter((field) => field.filter?.pattern)
            .map((field) =>
                field.filter!.pattern.replace(/^\^/, '').replace(/\$$/, '')
            )

        console.log('Query Condition: ', queryCondition)
        console.log('Patterns: ', patterns)

        tx.executeSql(
            `SELECT * FROM Credential WHERE ${queryCondition}`,
            patterns,
            (_, { rows }) => {
                const results = rows._array
                let parsedRows

                if (results.length > 0) {
                    parsedRows = rows._array.map((row) => ({
                        ...row,
                        context: JSON.parse(row.context || '[]'), // Default to empty array if undefined
                        type: JSON.parse(row.type || '[]'), // Default to empty array if undefined
                        issuer: JSON.parse(row.issuer || '[]'),
                        credentialSubject: JSON.parse(
                            row.credentialSubject || '{}'
                        ), // Default to empty object if undefined
                        proof: JSON.parse(row.proof || '{}'), // Default to empty object if undefined
                    }))
                } else {
                    parsedRows = false
                }

                console.log('parsedRows: ', parsedRows)
                callback(parsedRows)
            },
            (_, error) => {
                console.log('Error querying credentials:', error)
                callback(false)
                return false
            }
        )
    })
}

// Utility function to print all of the credentials
export const printAllCredentials = () => {
    db.transaction((tx) => {
        tx.executeSql(
            `SELECT * FROM Credential`,
            [],
            (_, { rows }) => {
                const results = rows._array
                console.log('All Credentials:', results)
            },
            (_, error) => {
                console.log('Error fetching all credentials:', error)
                return false
            }
        )
    })
}

// Utility function to insert testing data
export const insertTestData = () => {
    db.transaction((tx) => {
        tx.executeSql(
            `INSERT INTO DisplayCredential (displayName, displayIcon, favourite, credentialId) VALUES 
        (?, ?, ?, ?), 
        (?, ?, ?, ?), 
        (?, ?, ?, ?);`,
            [
                'Test Credential 1',
                '🔑',
                'false',
                '1',
                'Test Credential 2',
                '📄',
                'false',
                '2',
                'Test Credential 3',
                '📎',
                'true',
                '3',
            ],
            (_, result) => {
                console.log('Test data inserted successfully:', result)
            },
            (_, error) => {
                console.log('Error inserting test data', error)
                return false
            }
        )
    })
}

// Utility function to delete the database
export const deleteAll = () => {
    db.transaction((tx) => {
        tx.executeSql(
            'DELETE FROM DisplayCredential;',
            [],
            () => {
                console.log('DisplayCredential Table deleted successfully')
            },
            (_, error) => {
                console.log('Error deleting DisplayCredential table', error)
                return false
            }
        )

        tx.executeSql(
            'DELETE FROM Credential;',
            [],
            () => {
                console.log('Credential Table deleted successfully')
            },
            (_, error) => {
                console.log('Error deleting Credential table', error)
                return false
            }
        )
    })
}
