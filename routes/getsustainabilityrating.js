var express = require('express');
const contentful = require('contentful')
var dotenv = require('dotenv');
dotenv.config();
var router = express.Router();

const { CD_TOKEN, SPACE_ID, ENVIRONMENT_ID, CD_URL, PRIVATE_APP_KEY } = process.env;

const getsustainabilityrating = async (req, res) => {
  const partNumber = req.query.partNo;
  const contentType = req.query.contentType;

  if(!partNumber || !contentType) return res.send('Please provide require part number or content type').status(500);

  const client = contentful.createClient({
    space: SPACE_ID,
    environment: ENVIRONMENT_ID, // defaults to 'master' if not set
    accessToken: CD_TOKEN
  })
  console.log(contentType, partNumber)
  const entries = await client.getEntries({
    content_type: contentType,
    'fields.partNumber[eq]': partNumber
  });

  const entry = entries?.items[0];
  
  if(!entry) return res.send('No appliance found with part number').status(404);

  let appliance = {
    "applianceName": entry.fields.applianceName,
    "partNumber": entry.fields.partNumber,
    "sustainabilityRating": entry.fields.sustainabilityRating,
    "sustainabilityMarker": entry.fields.sustainabilityMarker
  }
  return res.send(appliance).status(200);
}

/* GET home page. */
router.get('/', getsustainabilityrating);

module.exports = router;
