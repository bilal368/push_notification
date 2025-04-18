const log = require("log4js").getLogger("Home");
const db = require("../config/database");
const redis = require("../config/redisSearch");
const rediscallData = require("../config/redisCallData");
const crypto = require('crypto');

class webDialer {

    static async webDialerLoginCheck(email, password) {
        try {
            // Fetch the user data from the Redis hash
            const userData = await redis.hget('tenantDetails', email); // HGET command for Redis hash

            if (!userData) {
                console.log("User not found in Redis.");
                return null; // No data found, return null or handle error as needed
            }

            // Parse the JSON data from Redis
            const parsedUserData = JSON.parse(userData);

            // Check if the password matches
            if (parsedUserData.hashedCloudPassword !== password) {
                console.log("Invalid password.");
                return null; // Invalid password
            }

            return parsedUserData;
        } catch (error) {
            console.error('Error checking login details:', error);
            throw error;
        }
    }

    // Phone Address
    static async phoneAddress(tenantId, fsExtension, extensionName, fsEmail) {
        try {
            let tenantData = []; // Initialize tenantData as an empty array
    
            // Fetch all data from the Redis hash 'tenantDetails'
            const allData = await redis.hgetall('tenantDetails');

            if (!allData || Object.keys(allData).length === 0) {
                console.log("No data found in tenantDetails.");
                return []; // Return an empty array if no data exists
            }
    
            // Parse all data and extract tenantId and corresponding details
            const parsedData = Object.entries(allData).map(([fsEmail, data]) => ({
                fsEmail, // Field key
                details: JSON.parse(data), // Parsed JSON value
            }));
    
            // Find and log the details for the matching tenantId
            parsedData.forEach(({ fsEmail, details }) => {

                if (details.tenantId == tenantId) {
                    tenantData.push(details); // Collect the matching details into tenantData
                }
            });
    
            if (tenantData.length === 0) {
                console.log(`No data found for tenantId: ${tenantId}`);
                return []; // Return an empty array if no matching data is found
            }
    
            console.log(`Fetched ${tenantData.length} records for tenantId: ${tenantId}`);
            return tenantData; // Return the collected data
        } catch (error) {
            console.error("Error fetching data for tenantId:", error);
            throw error;
        }
    }
    
    
    static async webDialerTokenSave(token, tenantExtensionId) {
        try {
            const [result] = await db.query('UPDATE xlTenantExtension SET token = ? WHERE tenantExtensionId = ?', [token, tenantExtensionId]);
            return result;
        } catch (error) {
            console.error(error);
        }
    }

    static async updateUserDetailsToRedis() {
        try {
          // Fetch all current data from MySQL
          const [rows] = await db.query('SELECT * FROM xlTenantExtension');
          console.log(`Fetched ${rows.length} rows from MySQL`);
      
          // Prepare Redis pipelines for batch operations
          const tenantDetailsPipeline = redis.pipeline();
          const tenantContactDetailsPipeline = redis.pipeline();
      
          // Fetch the existing tenantDetails from Redis (to preserve favorites)
          const existingTenantData = await redis.hgetall('tenantDetails');
          console.log(`Fetched existing tenant data from Redis`);
      
          // Clear the existing hashes
          await redis.del('v');
          await redis.del('tenantContactDetails');
          console.log('Cleared existing tenantDetails and tenantContactDetails hashes in Redis.');
      
          // Add data to the Redis hashes
          rows.forEach(row => {
            const emailFieldKey = row.fsEmail;
            const tenantDetails = {
              ...row,
              favorites: existingTenantData[emailFieldKey] ? JSON.parse(existingTenantData[emailFieldKey]).favorites : [], // Preserve the favorites
            };
            const emailValue = JSON.stringify(tenantDetails);
            tenantDetailsPipeline.hset('tenantDetails', emailFieldKey, emailValue);
      
            // Add data keyed by tenantId in tenantContactDetails
            const tenantIdFieldKey = row.tenantId;
            const tenantIdValue = JSON.stringify(row);
            tenantContactDetailsPipeline.hset('tenantContactDetails', tenantIdFieldKey, tenantIdValue);
          });
      
          // Execute both pipelines
          await Promise.all([
            tenantDetailsPipeline.exec(),
            tenantContactDetailsPipeline.exec(),
          ]);
      
          console.log('All data has been successfully synced to Redis hashes tenantDetails and tenantContactDetails.');
          return true;
      
        } catch (error) {
          console.error('Error syncing data to Redis hashes:', error);
          throw error;
        }
      }
      

}

module.exports = { webDialer };
