//Controllers
const userController = require('./controllers/users');
const ehrsController = require('./controllers/healthrecords');
const mediKeyController = require('./controllers/medi_key');
const healthPractitionersController = require('./controllers/healthPractitioners');

//Modules
const express = require("express");
const bodyParser = require('body-parser');
const cors = require('cors')

const Nexmo = require('nexmo');


const app = express();
const router = express.Router();

//Init Nexmo
const nexmo = new Nexmo({
    apiKey: 'db1d762c',
    apiSecret: 'BhJoQXQO6zz1nahc'
}, {debug: true});

app.use(bodyParser.urlencoded({ extended: false}));
app.use(bodyParser.json());

app.get('/emergency/', (req, res) => {
    const number = req.params.number;
    const text = 'Paul Byrne has been in an accident at \n\n3 Knockabawn, \nQuay Road,\nRush,\nCo.Dublin\n\nPlease donate a stir fry to help him';

    //format 353 -[0] /860811116
    nexmo.message.sendSms(
        'Emergency MEDIPASS', 353873985822, text, {type: 'unicode'},
        (err, responseData) => {
            if(err) {
                console.log(err);
            }
            else{
                console.dir(responseData);
            }
        }
    );

    res.send('sent');
});


app.get('/', async (req, res) => {

    res.status(200).send('Welcome to MediPass API');
    console.log('MediPass API');

})

app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*"); // update to match the domain you will make the request from
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
    res.header("Access-Control-Allow-Headers", "Content-Type");
    next();
  });

app.use("/api", router);

//User Profile Info Routes

router.route('/createEmergency/').post(userController.createEmergency);

router.route("/register/").post(userController.registerUser);

router.route("/login").post(userController.loginUser);

router.route("/user/:pid/getUserInfo").get(userController.getUserInfo);

router.route("/user/:pid/updateDetails").post(userController.updatePatientDetails);

router.route("/user/:pid/updateMedProfile").post(userController.updatePatientMedProfile);

router.route("/findDoctor/:searchContent").get(userController.findHealthPactioner);

router.route("/user/:pid/addConnection/:mpid").get(userController.addConnection);

router.route("/user/:pid/connections").get(userController.viewConnections);

router.route('/user/:pid/connection/alterConsent').post(userController.alterConnectionConsent);

router.route('/user/:pid/profileStats/').get(userController.getProfileStats);

router.route('/user/:pid/addContact').post(userController.addEmergencyContacts);

router.route('/user/:pid/getAllContacts').get(userController.getEmergencyContacts);


// //MediKey Routes
router.route("/user/:pid/getMediRing/").get(mediKeyController.getMediRing);

router.route("/user/:pid/createMediRing/").get(mediKeyController.createMediRing);

router.route("/mediring/:mdid/alterStatus/:status").put(mediKeyController.alterMediRingStatus);


// //Health Records Info Routes
// router.route("/validprescriptions/:pId").get(ehrsController.getValidPrescriptions);

router.route("/user/:pid/prescriptions").get(ehrsController.getPrescriptions);

router.route("/user/:pId/consultations").get(ehrsController.getConsultations);

router.route("/emr/:cId").get(ehrsController.getEMR);

// router.route("/medicinehistory/:pId").get(ehrsController.getPatientMedicineHistory);

//Health Practitioners Routues

router.route('/healthP/:mpid/patients').get(healthPractitionersController.getPatients);

router.route('/getEmergencies').get(healthPractitionersController.getEmergencies);




const server = app.listen(process.env.PORT || 5000, () => {
    
    const host = server.address().address;
    const port = server.address().port;
    
    console.log("Server is listening at:%s on post %s", host, port);

});