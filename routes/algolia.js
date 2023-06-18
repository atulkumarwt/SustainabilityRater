var express = require('express');
const algoliasearch = require('algoliasearch')
var dotenv = require('dotenv');
var router = express.Router();
dotenv.config();

const { SEARCH_TOKEN, INDEX_NAME } = process.env;
const client = algoliasearch('C6FGTTOFYO', SEARCH_TOKEN);
const index = client.initIndex(INDEX_NAME)

const getappliancerating = async (req, res) => {
  const partNumber = req.query.partNo;
  const contentType = req.query.contentType;

  if(!partNumber || !contentType) return res.send('Please provide require part number or content type').status(500);

  const hit = await index.findObject(hit => hit.partNumber == partNumber);

  if(!hit || hit == {}) return res.send('No appliance found with part number').status(404);

  let appliance = {
    "applianceName": hit.object.applianceName,
    "partNumber": hit.object.partNumber,
    "sustainabilityRating": hit.object.sustainabilityRating,
    "sustainabilityMarker": hit.object.sustainabilityMarker
  }

  return res.send(appliance).status(200);
}

const getappliancerecommendations = async (req, res) => {
  const sustainabilityRating = req.query.sustRating;
  const acType = req.query.type;
  const coolingCapacity = req.query.coolingCapacity;

  if(!sustainabilityRating || !acType || !coolingCapacity) return res.send('Missing Attributes').status(500);

  const result = await index.search('', {
    filters: `type:${acType}`,
    numericFilters:[`sustainabilityRating > ${sustainabilityRating}`, `coolingCapacity = ${coolingCapacity}`],
    hitsPerPage: 10,
  }).catch(e=>console.log(e));

  if(!result || result == {}) return res.send('No appliance found with part number').status(404);

  return res.send(result.hits).status(200);
}

/* GET home page. */
router.get('/get-appliance-rating', getappliancerating);

router.get('/get-recommendations', getappliancerecommendations);

module.exports = router;
