const crypto = require('crypto');
const mysql = require("mysql");
const dbconfig = require('../config/database');
const connection = mysql.createConnection(dbconfig.connection);

connection.query('USE ' + dbconfig.database);

//MediKey Util
var genRandomString = function(length) {
	return crypto.randomBytes(Math.ceil(length/2))
		.toString('hex') //Convert to Hex Format
		.slice(0, length); // return required number of characters
};

//SHA512
var sha512 = function (user_code, salt) {
	var hash = crypto.createHmac('sha512', salt); //Use SHA15
	hash.update(user_code);
	var value = hash.digest('hex');
	return {
		salt: salt,
		valueHash: value
	};
};

//Salt Hash Password
function saltHashMediKey(user_code) {
	var salt = genRandomString(16);  //Generate random string withn 16 character to salt
	var mediKey = sha512(user_code, salt);
	return mediKey;
}

function checkHashPassword(user_password, salt) {
    const passwordData = sha512(user_password, salt);
    return passwordData;
}

// Register User
exports.syncMediRing = async function(req, res ) {

    const pid = req.params.pid;
    const rbody = req.body;
    const user_password = rbody.password;
    const user_code = rbody.code;

    const hash_data = saltHashMediKey(user_code);
    const mediKey = hash_data.valueHash;

    // res.status(200).send('pid:'+pid+' mediKey:' +mediKey);
    // console.log('pid:'+pid+' mediKey:' +mediKey);

    const checkUser_sql = 'Select * From PatientAuth Where PatientID = ?';
    const addMediKeySQL = 'INSERT INTO `MediRing`(`MediRingID`, `MediKey`, `status`, `PatientID`) VALUES (?,?,?,?)';

    await connection.query(checkUser_sql, [pid], function(err, result, fields) {
        connection.on('Error', function(err) {
            console.log('[MySQL ERROR', err);
            res.status(400).send('Registration ERROR: ', err);
        });

        //If User Found
        if (result && result.length) {

            const salt = result[0].salt; //Get Salt of account if exists.
            const pass = result[0].Password //Get password of account if exists;

            //Hash Password from login request with salt in Database.
            const hashed_pass = checkHashPassword(user_password, salt).valueHash;
            if(pass == hashed_pass) {
                connection.query(addMediKeySQL, [null,mediKey, 1, pid], function(err, result, fields) {
                    connection.on('ERROR', function(err) {
                        console.log('[MySQL ERROR', err);
                        res.status(400).send('Add MediKey ERROR: ', err);
                    });
                console.log('MediKey Successfully Added');
                res.status(201).send('MediKey Added :' +mediKey);
                });
            }
            else {
                console.log(result);

                res.status(404).send(JSON.stringify('Wrong Password'));
            } 
        }
        else {
            console.log('Not Found');
            res.status(404).send('Invalid Credentials');
        }
    });



    
};