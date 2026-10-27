const express = require('express');
const { handleAppAccessWebhook } = require('../controllers/iamcorInternalController');
const { requireIamcorProvisionSecret } = require('../middleware/requireIamcorProvisionSecret');

const router = express.Router();

router.post('/app-access', requireIamcorProvisionSecret, handleAppAccessWebhook);

module.exports = router;
