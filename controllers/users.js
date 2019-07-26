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

//Password Util
var genRandomString = function (length) {
    return crypto.randomBytes(Math.ceil(length / 2))
        .toString('hex') //Convert to Hex Format
        .slice(0, length); // return required number of characters
};

//SHA512
var sha512 = function (password, salt) {
    var hash = crypto.createHmac('sha512', salt); //Use SHA15
    hash.update(password);
    var value = hash.digest('hex');
    return {
        salt: salt,
        passwordHash: value
    };
};

//Salt Hash Password
function saltHashPassword(userPassword) {
    var salt = genRandomString(16);  //Generate random string withn 16 character to salt
    var passwordData = sha512(userPassword, salt);
    return passwordData;
}

function checkHashPassword(user_password, salt) {
    const passwordData = sha512(user_password, salt);
    return passwordData;
}

// // Register User
exports.registerUser = async (req, res) => {

    const post_data = req.body;                 // Get post params
    const email = post_data.email;              // Get email from post_data
    const plaint_password = post_data.password; // Get password from post_data
    const hash_data = saltHashPassword(plaint_password);   //Get saltHashed password
    const password = hash_data.passwordHash;    //get hash value
    var salt = hash_data.salt;                  //Get salt

    //Validate Email Address
    if (!validateEmail(email)) {
        res.status(400).send('Email not valid');
        return;
    }

    //password conditions 
    // {1: lowercase, 1:uppercase, 1: numeric, 1: special char, 8 or more chars}
    if (!checkPasswordStrength(plaint_password)) {
        res.status(400).send('password not valid');
        return;
    }

    //SQL Queries
    const checkEmailSQL = 'Select * From `PatientAuth` Where Email =?';
    const insertUserSQL = 'INSERT INTO `PatientAuth`(`PatientID`, `Email`, `Password`, `Status`, `EmailVerified`, `salt`) VALUES (?,?,?,?,?,?)';
    const createMedProfileSQL = `Insert Into PatientMedProfile (PatientID) VALUES (?)`;
    const createDetailsSQL = `Insert Into PatientDetail (PatientID, CreatedDate) VALUES (?,?)`

    try {



        await connection.query(checkEmailSQL, [email], (err, result, fields) => {
            if (err) throw err;
            if (result && result.length) {
                console.log(result);
                res.status(409).send('Email Already Registered');
            }

            else {

                connection.query(insertUserSQL, [null, email, password, 0, 0, salt], async (err, result, fields) => {
                    if (err) throw err;
                    await connection.query('SELECT LAST_INSERT_ID() as newID', async (err, result, fields) => {
                        if (err) throw err;

                        console.log(result[0].newID);
                        const newID = result[0].newID;
                        await connection.query(createDetailsSQL, [newID, new Date()], (err, result, fields) => {
                            if (err) throw err;
                            console.log(newID);
                            connection.query(createMedProfileSQL, [newID], (err, result, fields) => {
                                if (err) throw err;
                                console.log(result);
                                res.status(201).send('User Successfully Created');
                            });
                        });
                    });
                });
            }
        });
    } catch (error) {

        console.log('ERROR', error);
        res.status(400).send(error);
    }
};

//Login User
exports.loginUser = async (req, res) => {

    const email = req.body.email; //Get Email from request params
    const user_password = req.body.password; // Get password from request params

    //Validate Email Address
    if (!validateEmail(email)) {
        res.status(400).send('Email not valid');
        return;
    }

    //password conditions - {1: lowercase, 1:uppercase, 1: numeric, 1: special char, 8 or more chars}
    if (!checkPasswordStrength(user_password)) {
        res.status(400).send('password not valid');
        return;
    }

    const checkUser_sql = 'Select * From PatientAuth Where Email = ?';

    try {

        await connection.query(checkUser_sql, [email], (err, result, fields) => {

            if (err) throw err;

            //If User Found
            if (result && result.length) {

                const salt = result[0].salt; //Get Salt of account if exists.
                const pass = result[0].Password //Get password of account if exists;

                //Hash Password from login request with salt in Database.
                const hashed_pass = checkHashPassword(user_password, salt).passwordHash;
                if (pass == hashed_pass) {
                    res.status(200).send(result[0]);
                }
                else {
                    console.log(result);
                    res.status(404).send(JSON.stringify('Invalid Credentials'));
                }
            }
            else {
                console.log('Not Found');
                res.status(404).send('Invalid Credentials');
            }
        });

    } catch (error) {
        console.log('ERROR', error);
        res.status(400).send(error);
    }
};

//Update Profile Details
exports.updatePatientDetails = async function (req, res) {

    const rbody = req.body;

    const pid = req.params.pid;
    const sname = rbody.sname;
    const fname = rbody.fname;
    const dob = rbody.dob;
    const sex = rbody.sex.toLowerCase();
    const ph_home = rbody.ph_home.trim();
    const ph_mobile = rbody.ph_mobile.trim();

    //Validate sname
    if (!checkIfLetters(sname)) {
        res.status(400).send('sname not valid');
        return;
    }

    //Validate fname
    if (!checkIfLetters(fname)) {
        res.status(400).send('fname not valid');
        return;
    }

    //Validate ID
    if (!checkIfInteger(pid)) {
        res.status(400).send('id invalid');
        return;
    }


    const sql = `Update PatientDetail Set SName = ?, FName = ?, DOB = ?, Sex = ?, Phone_Home = ?, Phone_Mobile = ? Where PatientID = ?`;

    try {

        connection.query(sql, [sname, fname, dob, sex, ph_home, ph_mobile, pid], function (err, result, fields) {
            if (err) throw err;
            console.log(result.affectedRows + " record(s) updated");
            res.status(201).send('User Details Successfully Updated');
        });

    } catch (error) {

        console.log('ERROR', error);
        res.status(400).send(error);
    }
};

//Update Profile Basic Medical Profile

// ERROR - SAYS ITS SUCCESSFUL IF ITS NOT -- FIX -------------------- >
exports.updatePatientMedProfile = async function (req, res) {

    const rbody = req.body;
    const pid = req.params.pid;
    const smoker = rbody.smoker;
    const drinker = rbody.drinker;
    const height = rbody.height;
    const weight = rbody.weight;
    const bloodtype = rbody.bloodtype.toString();
    const dnr = rbody.dnr;
    const allergies = rbody.allergies;

    const sql = `Update PatientMedProfile Set Smoker = ?, Drinker = ?, Height = ?, Weight = ?,BloodType = ?, DNR = ?, Allergies = ? Where PatientID = ?`;

    try {

        await connection.query(sql, [smoker, drinker, height, weight, bloodtype, dnr, allergies, pid], (err, result, fields) => {
            if (err) throw err;
            console.log(result.affectedRows + " record(s) updated");
            res.status(201).send('User Medical Profile Successfully Updated');
        });

    } catch (error) {

        console.log('ERROR', error);
        res.status(400).send(error);
    }
};

//Get User Profile Info
exports.getUserInfo = async (req, res) => {

    const pid = req.params.pid; //Get PatientID from request params
    const sql = `SELECT * From PatientDetail as pd Inner Join PatientMedProfile as pmp On pd.PatientID = pmp.PatientID Where pd.PatientID = ?`;

    await connection.query(sql, [pid], (err, result, fields) => {
        connection.on('Error', (err) => {
            console.log('[MySQL ERROR', err);
            res.status(400).send('Registration ERROR: ', err);
        });

        //If User Found
        if (result && result.length) {
            console.log('User Found');
            res.status(200).send(result[0]);
        }
        else {
            console.log('Not Found');
            res.status(404).send('Error No Details Found');
        }
    });
};

//Search HealthPractioners
exports.findHealthPactioner = async (req, res) => {

    const sc = connection.escape(req.params.searchContent);
    console.log(sc);

    let o = {} // empty Object
    let key = 'doctors';
    o[key] = []; // empty Array, which you can push() values into

    const sql = `SELECT MedPractionerID, FName, SName, Email, FieldOdSpecialization, AddressID
                FROM MedicalPractioner
                Where FName LIKE '` + req.params.searchContent + `%'
                OR SName Like '` + req.params.searchContent + `%'
                OR Email Like  '` + req.params.searchContent + `%'`;

    console.log(sql);

    await connection.query(sql, function (err, result, fields) {
        connection.on('Error', function (err) {
            console.log('[MySQL ERROR', err);
            res.status(400).send('Search ERROR: ', err);
        });

        //If User Found
        if (result && result.length) {

            for(i = 0; i < result.length; i++) {
                console.log(result[i]);
                o[key].push(result[i]);
            }


            console.log(o);
            res.status(200).send(o);
        }
        else {
            console.log('Not Found');
            res.status(404).send('Error No Details Found');
        }
    });
};

//Add Connection with Doctor
exports.addConnection = async (req, res) => {

    const p_id = req.params.pid;   //Get The PatientID from request
    const mp_id = req.params.mpid; //Get The Medical Practioners ID from request
    const sql = 'INSERT INTO Connection (`PatientID`, `MedicalPractionerID`, `CreatedAt`, `ExpireAt`, `ConsentStatus`) VALUES (?,?,?,?,?)';

    console.log('pid:' + p_id + '\nmp_id:' + mp_id);

    connection.query(sql, [p_id, mp_id, new Date(), new Date(), 1], function (err, result, fields) {
        connection.on('ERROR', function (err) {
            console.log('[MySQL ERROR', err);
            res.status(400).send('Connection Insert ERROR: ', err);
        });

        console.log('Connection Added.');
        res.status(201).send('Connection Added.');

    });
};

//View Connections
exports.viewConnections = async (req, res) => {

    let o = {} // empty Object
    let key = 'myDoctors';
    o[key] = []; // empty Array, which you can push() values into

    const pid = req.params.pid;
    const sql = `select * from Connection as c
                Join MedicalPractioner as mp
                ON c.MedicalPractionerID = mp.MedPractionerID
                where c.PatientId = ?`;

    await connection.query(sql, [pid], (err, result, fields) => {

        connection.on('Error', function (err) {
            console.log('[MySQL ERROR', err);
            res.status(400).send('Registration ERROR: ', err);
        });

        //If Connections found
        if (result && result.length) {
            console.log(result);

            for(i = 0; i < result.length; i++) {
                console.log(result[i]);
                o[key].push(result[i]);
            }

            console.log(o);
            res.status(200).send(o);
        }

        

        //If No Connections
        else {
            console.log('No Connections Found');
            res.status(404).send('No Connections Found');
        }
    });
};

//Alter Consent on Connection
exports.alterConnectionConsent = async (req, res) => {
    const pid = req.params.pid;
    const mpid = req.body.mpid;
    const cs = req.body.status;
    let newStatus = 0;

    if(cs == 1) {
        newStatus = 0;
        console.log("Consent for user: "+pid+ "Has changed to"+ newStatus)
    }
    else {
        newStatus = 1;
        console.log("Consent for user: "+pid+ "Has changed to"+ newStatus)
    }


    const sql = `Update Connection Set ConsentStatus = ? Where PatientID = ? AND MedicalPractionerID = ?`;

    try {

        await connection.query(sql, [newStatus, pid, mpid], (err, result, fields) => {

            if (err) throw err;
            console.log(result.affectedRows + " record(s) updated");
            res.status(200).send('Consent Changed');
        });

    } catch (error) {

        console.log('ERROR', error);
        res.status(400).send(error);
    }
};

////////////////////////////
//Validation Utils -- >
////////////////////////////


//Validate Email Address Util
function validateEmail(email) {
    if (/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(email)) {
        return (true) // -- Valid
    }
    return (false) // -- Invalid
}

//Validate Password UTIL
function checkPasswordStrength(password) {
    const strongRegex = new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.{8,})");
    if (strongRegex.test(password)) {
        return (true); // -- Valid
    }
    return (false); // -- Invalid
}

//Validate Number
function checkIfInteger(number) {
    if (/^\d*$/.test(number)) {
        return (true); // Valid
    }
    return (false); // Invalid
}

//Validate Letters
function checkIfLetters(str) {
    if (/^[a-zA-Z]+$/.test(str)) {
        return (true); // Valid
    }
    return (false); // Invalid
}

//Validate Sex
function validateSex(sex) {
    if (sex == 'm' || sex == 'male' || sex == 1) {
        return ('m');
    }
    else if (sex == 'f' || sex == 'female' || sex == 1) {
        return ('f');
    }

    else {
        return (0);
    }
}