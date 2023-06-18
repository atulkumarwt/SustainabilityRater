var express = require('express');
var axios = require('axios');
var path = require('path');
var fs = require('fs');
var dotenv = require('dotenv');
var {getManagementToken} = require('@contentful/node-apps-toolkit');
var router = express.Router();
dotenv.config();

const { APP_ID, CONTENT_TYPE_ID, BASE_URL, PRIVATE_APP_KEY } = process.env;
if (!APP_ID || !PRIVATE_APP_KEY) {
  throw new Error('APP ID or private key not specified. Make sure to run app setup first.');
}


const calculatePercentage = function percentage(partialValue, totalValue) {
  return (100 * partialValue) / totalValue;
} 

const mean =  function(data){
  if (data.length < 1) {
    return;
  }
  return data.reduce((prev, current) => prev + current) / data.length;
};

// create sustainability rating
const createsustainabilityrating = async (request, response) => {
  if(request.body == {}) return response.send('success').status(204);
  
  try{
  let {metadata, sys, fields} = request.body;
  let {wattage, annualEnergyConsumption, coolingCapacity, energyStarRating, averageLifespan, percentageOfRecyclableMaterialUsed, recyclablePercentage} = fields

    let modifiedFields = request.body.fields;

    // First we extract the Entry id and version from the payload
    const { id, version, contentType, space, environment } = sys;
    console.log(`Received webhook request because Entry ${id} was created`);

    if (contentType.sys.id !== CONTENT_TYPE_ID) {
      // If the content type does not match the one we created in setup, we just
      // ignore the event
      console.log(
        `Entry's content type: ${contentType.sys.id} did not match the content type created for the App, ignoring`
      );

      return response.send('success').status(204);
    }

    // return if any of the field is empty
    if(!(wattage?.['en-US']
    && annualEnergyConsumption?.['en-US']
    && coolingCapacity?.['en-US']
    && energyStarRating?.['en-US']
    && averageLifespan?.['en-US']
    && percentageOfRecyclableMaterialUsed?.['en-US']
    && recyclablePercentage?.['en-US']))
    {
      return response.send('success').status(204);
    }
    const avgLfSpanPerc = calculatePercentage(averageLifespan?.['en-US'], 10);
    const avgEnergyStrRtPerc = calculatePercentage(energyStarRating?.['en-US'], 5)

    const sustRating = mean([avgLfSpanPerc, avgEnergyStrRtPerc, percentageOfRecyclableMaterialUsed?.['en-US'], recyclablePercentage?.['en-US']])
    
    // We generate an AppToken based on our RSA keypair
    const spaceId = space.sys.id;
    const environmentId = environment.sys.id;
   
    const privateKey = fs.readFileSync(path.join(__dirname, '../', PRIVATE_APP_KEY), {
      encoding: 'utf8',
    });
    const appAccessToken = await getManagementToken(privateKey, {
      appInstallationId: APP_ID,
      spaceId,
      environmentId,
    });

    // We get the app installation to read out the custom parameters set in the app settings
    const appInstallation = await axios.get(
      `${BASE_URL}/spaces/${spaceId}/environments/${environmentId}/app_installations/${APP_ID}`,
      {
        headers: {
          Authorization: `Bearer ${appAccessToken}`,
          'Content-Type': 'application/json',
        },
      }
    ).then((r) => r.data);
    
    modifiedFields["sustainabilityRating"] = {"en-US":sustRating}
    
    //We make a request to contentful's CMA to update the Entry with our defaul values
    const res = await axios.put(
      `${BASE_URL}/spaces/${spaceId}/environments/${environmentId}/entries/${id}`,
      {
        fields: fields,
      },
      { 
        headers:  {
          Authorization: `Bearer ${appAccessToken}`,
          'X-Contentful-Content-Type': contentType.sys.id,
          'Content-Type': 'application/json',
          'X-Contentful-Version': version,
        }
      }
    );
    if (res.status === 200) {
      console.log(`Set default values for Entry ${id}`);
      return response.send('success').status(204);
    } else {
      throw new Error('failed to set default values' + (await res.data));
    }
  } catch (e) {
    console.error(e);
    return response.send('Internal Error').status(500);
    //throw new Error(e);
  }
};

/* Create Sustainability Rating. */
router.post('/', createsustainabilityrating);

module.exports = router;
