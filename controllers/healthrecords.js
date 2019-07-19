const crypto = require('crypto');
const mysql = require("mysql");
let connection;

function handleDisconnect() {
    connection = mysql.createConnection({
        host: 'us-cdbr-iron-east-02.cleardb.net',
        user: 'b795f1a2ae3d32',
        password: 'a7fa35f1',
        database: 'heroku_5964b350e9e6f96'
    });                                           // Recreate the connection, since
    // the old one cannot be reused.

    connection.connect(function (err) {              // The server is either down
        if (err) {                                     // or restarting (takes a while sometimes).
            console.log('error when connecting to db:', err);
            setTimeout(handleDisconnect, 2000); // We introduce a delay before attempting to reconnect,
        }                                     // to avoid a hot loop, and to allow our node script to
    });                                     // process asynchronous requests in the meantime.
    // If you're also serving http, display a 503 error.
    connection.on('error', function (err) {
        console.log('db error', err);
        if (err.code === 'PROTOCOL_CONNECTION_LOST') { // Connection to the MySQL server is usually
            handleDisconnect();                         // lost due to either server restart, or a
        } else {                                      // connnection idle timeout (the wait_timeout
            throw err;                                  // server variable configures this)
        }
    });
}

handleDisconnect();

//Get All Valid Prescriptions
exports.getValidPrescriptions = async (req, res) => {

    //Get Patient ID from HTTP REQUEST
    const pId = req.params.pId;
    console.log(pId);

    //Construct SQL Query
    const sql = `SELECT p.PrescriptionID, p.ExpiryDate, mp.FNAME, mp.Sname, pm.MedicineID, pm.Quantity, m.Name, m.Type
                From Consultation AS c 
                Left Join MedicalPractioner AS mp
                ON c.MedPractionerID = mp.MedPractionerID 
                LEFT JOIN Prescription AS p
                ON c.ConsultationID = p.ConsultationID 
                LEFT JOIN PrescriptionMedicine AS pm
                ON pm.PrescriptionID = p.PrescriptionID 
                LEFT JOIN Medicine AS m
                ON m.MedicineID = pm.MedicineID
                WHERE PatientID = ?
                AND p.ExpiryDate > CURDATE() 
                AND p.status = 1 
                ORDER BY ExpiryDate DESC;`;

    try {

        await connection.query(sql, [pId], (err, result, fields) => {
            if (err) throw err;
            console.log(result);
            res.status(200).send(result);
        });

        } catch (error) {
            console.log('ERROR', error);
            res.status(400).send(error);
        }
};

//Get All Prescriptions
exports.getPrescriptions = async function(req, res) {

    //Get Patient ID from HTTP REQUEST
    const pId = req.params.pId;

    //Construct SQL Query
    const sql = `SELECT p.PrescriptionID, p.ExpiryDate, p.Status, mp.FNAME, mp.Sname, pm.MedicineID, pm.Quantity, m.Name, m.Type
                From Consultation AS c 
                Left Join MedicalPractioner AS mp
                ON c.MedPractionerID = mp.MedPractionerID 
                LEFT JOIN Prescription AS p
                ON c.ConsultationID = p.ConsultationID 
                LEFT JOIN PrescriptionMedicine AS pm
                ON pm.PrescriptionID = p.PrescriptionID 
                LEFT JOIN Medicine AS m
                ON m.MedicineID = pm.MedicineID
                WHERE PatientID = `+pId+` 
                ORDER BY ExpiryDate DESC;`;

    try {

        const data = await connection.query(sql);
        console.log(data);
        res.status(200).send(data);
        
    } catch (error) {
        
        console.log('ERROR', error);
        res.status(400).send(error);

        }

    console.log('Query Finished');
};

// Get All Consultations
exports.getConsultations = async function(req, res) {

    //Get Patient ID from HTTP Request
    const pId = req.params.pId;

    let o = {} // empty Object
let key = 'Consultations';
o[key] = []; // empty Array, which you can push() values into
    
    // //Construct SQL Query
    const sql = `SELECT * FROM Consultation WHERE PatientID = ?`;

    try {
        await connection.query(sql, [pId], (err, result, fields) => {
            if(err) throw err;

            for(i = 0; i < result.length; i++) {
                console.log(result[i]);
                o[key].push(result[i]);
            }
            
            let response = o[key];
            console.log(o);
            res.status(200).send(o);
        });
        // const data = await connection.query(sql);
        // console.log(data);
        // res.status(200).send(data);
        
    } catch (error) {
        
        console.log('ERROR', error);
        res.status(400).send(error);

        }

    console.log('Query Finished');
};

// Get Whole EMR (Electronic Medical Record) - Consulatation, MedicalPractioner, Prescription, prescriptionMedicine, Medicine
exports.getEMR = async function(req, res) {

    const cId= req.params.cId;
    const sqlQuery = `Select c.*, mp.MedPractionerID, mp.FName, mp.SName, p.*, pm.*, m.*
                        From Consultation AS c 
                        Left Join MedicalPractioner AS mp
                        ON c.MedPractionerID = mp.MedPractionerID 
                        LEFT JOIN Prescription AS p
                        ON c.ConsultationID = p.ConsultationID 
                        LEFT JOIN PrescriptionMedicine AS pm
                        ON pm.PrescriptionID = p.PrescriptionID 
                        LEFT JOIN Medicine AS m
                        ON m.MedicineID = pm.MedicineID
                        WHERE c.ConsultationID = ?`;

    // //Key relations, Define each table's primary and foreign keys
    var nestingOptions = [
        { tableName : 'c', pkey: 'ConsultationID', fkeys:[{table:'mp',col:'MedPractionerID'}]},
        { tableName : 'mp', pkey: 'MedPractionerID'},
        { tableName : 'p', pkey: 'PrescriptionID', fkeys:[{table:'c',col:'ConsultationID'}]},
        { tableName : 'pm', pkey: 'MedicineID', fkeys:[{table:'p',col:'PrescriptionID'},{table:'m',col:'MedicineID'}]},
        { tableName : 'm', pkey: 'MedicineID'}  
    ];

    try {
        connection.query({sql: sqlQuery, nestTables: true}, [cId], function (err, rows) {

            // error handling
            if (err){
                console.log('Internal error: ', err);
                res.send("Mysql query execution error!");
            }

            else {
                var nestedRows = func.convertToNested(rows, nestingOptions);

                console.log(nestedRows);
                // res.send(JSON.stringify(nestedRows));
                res.send(nestedRows);
            }
        
        });
    } catch (error) {

    }
};

// Get Patient Medicine History
exports.getPatientMedicineHistory = async function(req, res) {

    console.log('succes');
    const pId = req.params.pId;
    const sql = 'Select c.PatientID,m.* From Consultation as c JOIN Prescription as p ON c.ConsultationID = p.ConsultationID JOIN PrescriptionMedicine as pm ON p.PrescriptionID = pm.PrescriptionID JOIN Medicine as m ON pm.MedicineID = m.MedicineID WHERE c.PatientID = '+pId;
    
    //Key relations, Define each table's primary and foreign keys
    var nestingOptions = [
        { tableName : 'm', pkey: 'MedicineID'} 
    ];

    connection.query({sql: sql, nestTables: true}, function (err, rows) {
        // error handling
        if (err){
            console.log('Internal error: ', err);
            res.send("Mysql query execution error!");
        }

        else {
            var nestedRows = func.convertToNested(rows, nestingOptions);

            console.log(nestedRows);
            // res.send(JSON.stringify(nestedRows));
            res.send(nestedRows);
        }
    });
};
