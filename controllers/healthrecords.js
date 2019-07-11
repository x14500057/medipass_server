const mysql = require("mysql");
const dbconfig = require('../config/database');
const connection = mysql.createConnection(dbconfig.connection);
var func = require('../main.js');
connection.query('USE ' + dbconfig.database);

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

    //Construct SQL Query
    const sql = `SELECT * FROM Consultation WHERE PatientID =` +pId;

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
