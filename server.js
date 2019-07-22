//Controllers
const userController = require('./controllers/users');
const ehrsController = require('./controllers/healthrecords');
const mediKeyController = require('./controllers/medi_key');

//Modules
const express = require("express");
const bodyParser = require('body-parser');

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

app.get('/emergency/:number/', (req, res) => {
    const number = req.params.number;
    const text = 'MediPass - Emergency \n\nToni Byrne has been in an accident at \n\n3 Knockabawn, \nQuay Road,\nRush,\nCo.Dublin\n\n';

    nexmo.message.sendSms(
        'Emergency MEDIPASS', number, text, {type: 'unicode'},
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



// app.get('/', async (req, res) => {

//     res.status(200).send('Welcome to MediPass API');
//     console.log('MediPass API');

// })

app.use("/api", router);

// //User Profile Info Routes

router.route("/register/").post(userController.registerUser);

// router.route("/login/:email/:password").get(userController.loginUser);

router.route("/login").post(userController.loginUser);

router.route("/user/:pid/getUserInfo").get(userController.getUserInfo);

router.route("/user/:pid/updateDetails").post(userController.updatePatientDetails);

router.route("/user/:pid/updateMedProfile").post(userController.updatePatientMedProfile);

router.route("/findDoctor/:searchContent").get(userController.findHealthPactioner);

router.route("/user/:pid/addConnection/:mpid").get(userController.addConnection);

router.route("/user/:pid/connections").get(userController.viewConnections);

router.route('/user/:pid/alterConnection/:mpid/:consentStatus').get(userController.alterConnectionConsent);


// //MediKey Routes
router.route("/user/:pid/getMediRing/").get(mediKeyController.getMediRing);

router.route("/user/:pid/createMediRing/").get(mediKeyController.createMediRing);

router.route("/user/:pid/status/:status").put(mediKeyController.alterMediRingStatus);


// //Health Records Info Routes
// router.route("/validprescriptions/:pId").get(ehrsController.getValidPrescriptions);

// router.route("/prescriptions/:pId").get(ehrsController.getPrescriptions);

router.route("/user/:pId/consultations").get(ehrsController.getConsultations);

router.route("/emr/:cId").get(ehrsController.getEMR);

// router.route("/medicinehistory/:pId").get(ehrsController.getPatientMedicineHistory);



const server = app.listen(process.env.PORT || 5000, () => {
    
    const host = server.address().address;
    const port = server.address().port;
    
    console.log("Server is listening at:%s on post %s", host, port);

});