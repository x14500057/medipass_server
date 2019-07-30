const crypto = require('crypto');
const mysql = require("mysql");
const func = require("../main");
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

    console.log("working");

    //Get Patient ID from HTTP REQUEST
    const pid = req.params.pid;

    let o = {} // empty Object
    let key = 'prescriptions';
    o[key] = []; // empty Array, which you can push() values into

    //Construct SQL Query
    const sql = `SELECT p.PrescriptionID, p.ExpiryDate, p.Status, mp.Fname, mp.Sname, pm.MedicineID, pm.Quantity, m.Name, m.Type
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
                ORDER BY ExpiryDate DESC;`;

    try {

        connection.query(sql, [pid], (error, result, fields) => {
            if(error) throw error;

            for(i = 0; i < result.length; i++) {

                // if(!result[i].PrescriptionID.equals(null)) {
                //     console.log("null");
                // }
                if(result[i].PrescriptionID != null) {
                    console.log(result[i]);
                    o[key].push(result[i]);
                };
                // o[key].push(result[i]);
            }
            console.log(o);
            res.status(200).send(o);

        });
        
    } catch (error) {
        
        console.log('ERROR', error);
        res.status(400).send(error);

        }

    console.log('Query Finished');
};

// Get All Consultations
exports.getConsultations = async function(req, res) {

    // //Get Patient ID from HTTP Request
    const pId = req.params.pId;


    let o = {} // empty Object
    let key = 'Consultations';
    o[key] = []; // empty Array, which you can push() values into
    
    // //Construct SQL Query
    const sql = `SELECT * FROM Consultation as c Inner Join MedicalPractioner AS mp ON c.MedPractionerID = mp.MedPractionerID WHERE PatientID = ?`;

    try {
        await connection.query(sql, [pId], (err, result, fields) => {
            if(err) throw err;

            for(i = 0; i < result.length; i++) {
                console.log(result[i]);
                o[key].push(result[i]);
            }
            
        
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

    try {

        await connection.query(sqlQuery, [cId],  (err, result, fields) => {

            // error handling
            if (err){
                console.log('Internal error: ', err);
                res.send("Mysql query execution error!");
            }

            else {

                    var emr = JSON.parse('{"emr":' +
                    '{"cid":"'+result[0].ConsultationID+'","pid":'+result[0].PatientID+',"mpid":'+result[0].MedPractionerID+',"symptoms":"'+result[0].Symptoms+'", ' +
                    '"diagnostics":"'+result[0].Diagnostic+'","treatments":"'+result[0].Treatment+'","bpressure":"'+result[0].BPressure+'","notes":"'+result[0].Notes+'", ' +
                    '"date":"'+result[0].Date+'","mpFname":"'+result[0].FName+'","mpSname":"'+result[0].SName+'","prescid":'+result[0].PrescriptionID+',"expdate":"'+result[0].ExpiryDate+'", ' +
                    '"status":'+result[0].status+', "medicines" : [] }}');

                    for (var i = 0; i < result.length; i++) {

                        var medicine = JSON.parse('{"mid":'+result[i].MedicineID+', "quantity":'+result[i].Quantity+',"comments":"'+result[i].Comments+'", ' +
                        '"mName":"'+result[i].Name+'","purpose":"'+result[i].Purpose+'", "type":"'+result[i].Type+'","altNames":"'+result[i].AlsoCalled+'", "mdesc":"'+result[i].Description+'"}');
                        
                        emr['emr'].medicines.push(medicine);
                    
                    }
                        // console.log(emr);
                        res.status(200).send(emr);
                }
         });

        } catch (error) {
        
        res.status(400).send(error);
    }


    //Big O notation reduced by three nested arrays !! - way more efficient 
    // // //Key relations, Define each table's primary and foreign keys
    // var nestingOptions = [
    //     { tableName : 'c', pkey: 'ConsultationID', fkeys:[{table:'mp',col:'MedPractionerID'}]},
    //     { tableName : 'mp', pkey: 'MedPractionerID'},
    //     { tableName : 'p', pkey: 'PrescriptionID', fkeys:[{table:'c',col:'ConsultationID'}]},
    //     { tableName : 'pm', pkey: 'MedicineID', fkeys:[{table:'p',col:'PrescriptionID'},{table:'m',col:'MedicineID'}]},
    //     { tableName : 'm', pkey: 'MedicineID'}  
    // ];

    // try {
    //     connection.query({sql: sqlQuery, nestTables: true}, [cId], function (err, rows) {

    //         // error handling
    //         if (err){
    //             console.log('Internal error: ', err);
    //             res.send("Mysql query execution error!");
    //         }

    //         else {
    //             var nestedRows = func.convertToNested(rows, nestingOptions);
                
    //             o[key] = nestedRows;
    //             console.log(o);
    //             // res.send(JSON.stringify(nestedRows));
    //             res.send(o);
    //         }
        
    //     });
    // } catch (error) {

    // }
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
