// Import necessary modules
const logger = require('../config/logger');
const crypto = require('crypto');
const moment = require("moment");

const webDialerModel = require("../models/userModel");
const webDialer = webDialerModel.webDialer;

const redisUsersDetails = require("../config/redisSearch");
const { redisClient } = require("../config/redisCallData");
const socket = require('../utils/socket');

require('../utils/env');

const { generateToken } = require('../utils/jwtUtils');
/***********************************************************************************************************************************************************************/

//Asynchronously calculates the UTC date range based on the specified date range, timezone offset, and optional start of the week 
async function getUTCDateRange(dateRange, timeZoneOffset, startOfWeek = 0) {
  let start, end;

  // Set the start day of the week
  moment.updateLocale(moment.locale(), { week: { dow: startOfWeek } });

  // Create a moment object with the current time and apply the offset
  const currentTimeWithOffset = moment().utcOffset(timeZoneOffset);

  // Calculate the start and end dates based on the provided date range
  switch (dateRange) {
    case 'thishour':
      // Start and end of the current hour
      start = currentTimeWithOffset.clone().startOf('hour').utc();
      end = currentTimeWithOffset.clone().endOf('hour').utc();
      break;
    case 'lasthour':
      // Start and end of the previous hour
      start = currentTimeWithOffset.clone().subtract(1, 'hour').startOf('hour').utc();
      end = currentTimeWithOffset.clone().subtract(1, 'hour').endOf('hour').utc();
      break;
    case 'today':
      // Start and end of the current day
      start = currentTimeWithOffset.clone().startOf('day').utc();
      end = currentTimeWithOffset.clone().endOf('day').utc();
      break;
    case 'yesterday':
      // Start and end of the previous day
      start = currentTimeWithOffset.clone().subtract(1, 'day').startOf('day').utc();
      end = currentTimeWithOffset.clone().subtract(1, 'day').endOf('day').utc();
      break;
    case 'last5Days':
      // Start of 5 days ago to the current moment
      start = currentTimeWithOffset.clone().subtract(5, 'days').startOf('day').utc();
      end = currentTimeWithOffset.clone().endOf('day').utc();
      break;
    case 'thisWeek':
      // Start and end of the current week
      start = currentTimeWithOffset.clone().startOf('week').utc();
      end = currentTimeWithOffset.clone().endOf('week').utc();
      break;
    case 'lastWeek':
      // Start and end of the previous week
      start = currentTimeWithOffset.clone().subtract(1, 'week').startOf('week').utc();
      end = currentTimeWithOffset.clone().subtract(1, 'week').endOf('week').utc();
      break;
    case 'thisMonth':
      // Start and end of the current month
      start = currentTimeWithOffset.clone().startOf('month').utc();
      end = currentTimeWithOffset.clone().endOf('month').utc();
      break;
    case 'lastMonth':
      // Start and end of the previous month
      start = currentTimeWithOffset.clone().subtract(1, 'month').startOf('month').utc();
      end = currentTimeWithOffset.clone().subtract(1, 'month').endOf('month').utc();
      break;
    case 'thisQuarter':
      // Start and end of the current quarter
      start = currentTimeWithOffset.clone().startOf('quarter').utc();
      end = currentTimeWithOffset.clone().endOf('quarter').utc();
      break;
    case 'lastQuarter':
      // Start and end of the previous quarter
      start = currentTimeWithOffset.clone().subtract(1, 'quarter').startOf('quarter').utc();
      end = currentTimeWithOffset.clone().subtract(1, 'quarter').endOf('quarter').utc();
      break;
    case 'thisYear':
      // Start and end of the current year
      start = currentTimeWithOffset.clone().startOf('year').utc();
      end = currentTimeWithOffset.clone().endOf('year').utc();
      break;
    case 'lastYear':
      // Start and end of the previous year
      start = currentTimeWithOffset.clone().subtract(1, 'year').startOf('year').utc();
      end = currentTimeWithOffset.clone().subtract(1, 'year').endOf('year').utc();
      break;
    case 'last31Days':
      // Start of 31 days ago to the current moment
      start = currentTimeWithOffset.clone().subtract(31, 'days').startOf('day').utc();
      end = currentTimeWithOffset.clone().endOf('day').utc();
      break;
    default:
      console.log('Invalid date range specifier, setting time to today');
      // Start and end of the current day
      start = currentTimeWithOffset.clone().startOf('day').utc();
      end = currentTimeWithOffset.clone().endOf('day').utc();
      break;
  }

  // Return the calculated start and end dates
  return { start, end };
}


// Function to execute a RediSearch query
const searchWithQuery = async (indexName, query) => {
  return new Promise((resolve, reject) => {
    redisUsersDetails.call('FT.SEARCH', indexName, query, 'LIMIT', 0, 10000, (err, results) => {
      if (err) {
        reject(err);
      } else {
        resolve(results);
      }
    });
  });
};

// Function to format time as "YYYY-MM-DD HH:MM:SS" in UTC
const formatDate = (timestamp) => {

  // Convert timestamp to a Date object
  const date = new Date(timestamp);

  // Extract UTC date and time components
  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0'); // Month is 0-indexed
  const year = date.getUTCFullYear();

  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');

  // Return formatted string
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

// Function to adjust time by adding the timeZoneOffset
const adjustTime = (timestamp, offset) => {
  // Convert the custom timestamp to a Date object
  const timestampStr = timestamp.toString();
  const year = timestampStr.substring(0, 4);
  const month = timestampStr.substring(4, 6) - 1;  // Months are 0-based
  const day = timestampStr.substring(6, 8);
  const hour = timestampStr.substring(8, 10);
  const minute = timestampStr.substring(10, 12);
  const second = timestampStr.substring(12, 14);

  // Create a Date object directly using the numeric values
  const date = new Date(Date.UTC(year, month, day, hour, minute, second));

  if (isNaN(date.getTime())) {
    console.error("Invalid Date for timestamp:", timestampStr);
    return null;
  }

  // Adjust the time by adding the offset in minutes
  date.setUTCMinutes(date.getUTCMinutes() + offset);

  //console.log("Adjusted date:", date);
  return date;
};

// Helper function to format the date
function formatDateCall(dateString) {
  if (!dateString || typeof dateString !== 'string' || dateString.length !== 8) {
    return null; // Return null if the date string is invalid
  }

  // Split the date string into year, month, and day
  const [year, month, day] = dateString.split('_');

  // Assuming the year is in YY format (e.g., 25 -> 2025)
  const fullYear = `20${year}`;

  // Format the date as DD-MM-YYYY
  return `${day}-${month}-${fullYear}`;
}

// Web Dialer Login
exports.webDialerLogin = async (req, res, next) => {
  try {
    logger.info(`API call: ${req.method} ${req.url}`);

    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).send({ message: 'Email and password are required' });
      return;
    }

    // Step 1: Hash the provided password
    const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
    const result = await webDialer.webDialerLoginCheck(email, hashedPassword);

    if (result == null) {
      res.status(401).send({ message: 'Invalid username or password' });
      return;
    }

    const user = result;
    if (user.active === 0) {
      res.status(403).send({ message: 'Invalid access' });
      return;
    }

    const storedHashedPassword = user.extensionPassword;
    if (!storedHashedPassword) {
      res.status(401).send({ message: 'Invalid username or password' });
      return;
    }

    // Generate token and save
    const userToken = {
      fsExtension: user.fsExtension,
      fsDomain: user.fsDomain,
    };

    const token = generateToken(userToken);
    await webDialer.webDialerTokenSave(token, user.tenantExtensionId);

    const domainDetails = await redisClient.hgetall(`xlDomain:${user.fsDomain}`);
    const isRegulationEnabled = domainDetails.isRegulationEnabled

    res.status(200).send({
      message: 'Login success',
      tenantExtensionId: user.tenantExtensionId,
      tenantId: user.tenantId,
      fsExtension: user.fsExtension,
      extensionCategory: user.extensionCategory,
      extensionPassword: user.extensionPassword,
      fsDomain: user.fsDomain,
      fsEmail: user.fsEmail,
      extensionName: user.extensionName,
      active: user.active,
      uri: `${user.fsExtension}@${user.fsDomain}`,
      wsServers: user.wsServers,
      timeZoneOffset: user.timeZoneOffset,
      timeZone: user.zoomTimeZone,
      isRegulationEnabled: isRegulationEnabled,
      token: token,
      userName: `${user.fsFirstName} ${user.fsLastName}`
    });
  } catch (error) {
    console.log(`Error occurred during login:`, error);
    logger.error(`Error occurred during login: ${error}`);
    res.status(500).send({ message: 'Internal server error' });
  }
};
// Update Users into Redis
exports.updateUsersToRedis = async (req, res, next) => {
  try {
    logger.info(`API call: ${req.method} ${req.url}`);
    const result = await webDialer.updateUserDetailsToRedis();
    if (result) {
      res.status(200).send({ status: true, message: 'All data has been successfully loaded into Redis.' });
    }
  } catch (error) {
    console.log("Error occurred during update users in redis:", error);
    logger.error(`Error occurred during update users in redis: ${error}`);
    res.status(500).send({ message: 'Internal server error' });
  }
};
// Get Web Dialer History For A Month
exports.getWebDialerHistory = async (req, res, next) => {
  try {
    logger.info(`API call: ${req.method} ${req.url}`);

    const {
      extensionCategory, tenantId, fsExtension, dateRange = 'last5Days',
      timeZoneOffset = 0
    } = req.body;

    if (!extensionCategory || !tenantId || !fsExtension) {
      return res.status(400).json({ message: 'Missing required fields. Please provide all necessary details.' });
    }

    const userCurrentUTCTime = await getUTCDateRange(dateRange, timeZoneOffset);
    const startNowString = userCurrentUTCTime.start.format('YYYYMMDDHHmmss');
    const endNowString = userCurrentUTCTime.end.format('YYYYMMDDHHmmss');

    const baseQuery = `@callEndTime:[${startNowString} ${endNowString}] @tenantId:[${tenantId} ${tenantId}] @extensionNumber:${fsExtension}`;
    let results;

    switch (extensionCategory) {
      case "UC":
        results = await searchWithQuery('XLOGIX:callogid', baseQuery);
        break;
      case "CC":
        results = await searchWithQuery('CC_XLOGIX:cc_callogid', baseQuery);
        break;
      default:
        return res.status(400).json({ message: 'Invalid extension category. Accepted values are "UC" or "CC".' });
    }

    const formattedResults = (await Promise.all(
      results
        .filter(item => Array.isArray(item) && item[1] && typeof item[1] === 'string')
        .map(async (item) => {
          try {
            const parsedItem = JSON.parse(item[1]);
            parsedItem.callStartTime = formatDate(adjustTime(parsedItem.callStartTime, timeZoneOffset));
            parsedItem.callEndTime = formatDate(adjustTime(parsedItem.callEndTime, timeZoneOffset));

            if (parsedItem.callDirectionText === 'Internal') {
              if (parsedItem.extensionNumber.includes(`${fsExtension}->`)) {
                parsedItem.callDirectionText = 'Outgoing';
                parsedItem.extensionNumber = parsedItem.extensionNumber.replace(`${fsExtension}->`, '');
              } else if (parsedItem.extensionNumber.includes(`->${fsExtension}`)) {
                parsedItem.callDirectionText = 'Incoming';
                parsedItem.extensionNumber = parsedItem.extensionNumber.replace(`->${fsExtension}`, '');
              }
            }

            if (parsedItem.incomingStatusText === 'Agent Abandoned') {
              parsedItem.extensionNumber = 'Connection failed';
            }

            return parsedItem;
          } catch (parseError) {
            logger.warn(`Failed to parse call log item: ${parseError.message}`);
            return null;
          }
        })
    )).filter(Boolean).sort((a, b) => new Date(b.callStartTime) - new Date(a.callStartTime));

    const groupedResults = [];
    let tempGroup = null;

    const extensionHistoryMap = {};

    formattedResults.forEach((item, index) => {
      const groupingKey = item.customerNumber && item.customerNumber.trim() !== ""
        ? item.customerNumber
        : item.extensionNumber;

      if (!extensionHistoryMap[groupingKey]) {
        extensionHistoryMap[groupingKey] = [];
      }
      extensionHistoryMap[groupingKey].push(item);

      if (!tempGroup || tempGroup.groupKey !== groupingKey) {
        if (tempGroup) {
          groupedResults.push(tempGroup);
        }
        tempGroup = {
          groupKey: groupingKey,
          customerNumber: item.customerNumber.trim() !== "" ? item.customerNumber : item.extensionNumber,
          extensionNumber: item.extensionNumber,
          callLogs: [item],
          count: 1
        };
      } else {
        tempGroup.callLogs.push(item);
        tempGroup.count += 1;
      }

      if (index === formattedResults.length - 1) {
        groupedResults.push(tempGroup);
      }
    });

    const extensionHistoryArray = Object.keys(extensionHistoryMap).map(customerNumber => ({
      customerNumber: customerNumber,
      history: extensionHistoryMap[customerNumber],
      count: extensionHistoryMap[customerNumber].length
    }));

    // Extract missed calls from groupedData
    const missedCalls = [];

    groupedResults.forEach(group => {
      const missedCallEntries = group.callLogs.filter(log =>
        log.callDirectionText === "Incoming" && log.callTypeText === "Missed Call"
      );

      if (missedCallEntries.length > 0) {
        missedCalls.push({
          customerNumber: group.customerNumber,
          missedCallCount: missedCallEntries.length,
          missedCallLogs: missedCallEntries
        });
      }
    });



    res.status(200).send({
      status: true,
      message: 'Web Dialer History retrieved successfully',
      groupedData: groupedResults,
      extensionHistories: extensionHistoryArray,
      missedCalls: missedCalls
    });
  } catch (error) {
    logger.error(`Error occurred during Dialer History retrieval: ${error.message}`);
    res.status(500).json({ status: false, message: 'Internal server error' });
  }
};
// Get Phone Address
exports.phoneAddress = async (req, res, next) => {
  try {
    logger.info(`API call: ${req.method} ${req.url}`);
    const { tenantId, fsExtension, extensionName, fsEmail } = req.body;

    if (!tenantId) return res.status(400).send({ message: 'tenantId is required' });
    if (!fsExtension) return res.status(400).send({ message: 'fsExtension is required' });
    if (!extensionName) return res.status(400).send({ message: 'extensionName is required' });
    if (!fsEmail) return res.status(400).send({ message: 'fsEmail is required' });

    const result = await webDialer.phoneAddress(tenantId, fsExtension, extensionName, fsEmail);
    if (!result) return res.status(401).send({ message: 'Invalid username or password' });

    // Fetch presence status from Redis
    const redisKey = `TENANT_${tenantId}`;
    const extensionStatus = await redisClient.hgetall(redisKey);

    // Status mapping
    const statusMapping = {
      0: "UNAVAILABLE",
      1: "AVAILABLE",
      2: "RINGING",
      3: "DIALING",
      4: "ON_CALL",
      5: "ON_HOLD",
    };

    // Parse and map statuses
    const statusMap = {};
    if (extensionStatus) {
      for (const [key, value] of Object.entries(extensionStatus)) {
        try {
          const extData = JSON.parse(value);
          statusMap[extData.extension_number] = {
            status: extData.status || 0,
            currentStatus: statusMapping[extData.status] || "UNKNOWN"
          };
        } catch (error) {
          console.error(`Error parsing extension data for key ${key}:`, error);
        }
      }
    }

    // Update result with presence status and favorites
    const updatedResult = result.map(item => {
      const extStatus = statusMap[item.fsExtension] || { status: 0, currentStatus: "UNKNOWN" };
      return {
        ...item,
        status: extStatus.status,
        currentStatus: extStatus.currentStatus,
        favorites: item.favorites && item.favorites.includes(fsExtension)
      };
    });

    return res.status(200).send({ result: updatedResult });
  } catch (error) {
    logger.error(`Error occurred during Dialer History retrieval: ${error.message}`);
    res.status(500).json({ status: false, message: 'Internal server error' });
  }
};

// Add Favorite
exports.addFavorite = async (req, res, next) => {
  try {
    logger.info(`API call: ${req.method} ${req.url}`);

    const { fsEmail, fsExtensions, userId } = req.body;

    // Validate required fields
    if (!fsEmail) {
      return res.status(400).send({ message: 'fsEmail is required' });
    }
    if (!fsExtensions || !Array.isArray(fsExtensions) || fsExtensions.length === 0) {
      return res.status(400).send({ message: 'fsExtensions array is required' });
    }
    if (!userId) {
      return res.status(400).send({ message: 'userId is required' });
    }

    // Fetch all tenant data from Redis
    const tenantData = await redisUsersDetails.hgetall('tenantDetails');

    if (!tenantData) {
      return res.status(404).send({ message: 'No tenant data found' });
    }

    let updatedTenants = {};

    // Iterate through each tenant
    for (const email in tenantData) {
      let tenant;
      try {
        tenant = JSON.parse(tenantData[email]);
      } catch (error) {
        logger.error(`Error parsing tenant data for email: ${email} - ${error.message}`);
        continue;
      }

      // Check if the tenant's fsExtension matches any of the given fsExtensions
      if (fsExtensions.includes(tenant.fsExtension)) {
        // Initialize favorites if not present
        if (!tenant.favorites) {
          tenant.favorites = [];
        }

        // Add userId to favorites if not already present
        if (!tenant.favorites.includes(userId)) {
          tenant.favorites.push(userId);
        }
      } else {
        // If the fsExtension is not in the provided fsExtensions, reset favorites to an empty array
        tenant.favorites = [];
      }

      // Store updated tenant
      updatedTenants[email] = JSON.stringify(tenant);
    }

    // Update Redis in batch
    if (Object.keys(updatedTenants).length > 0) {
      await redisUsersDetails.hmset('tenantDetails', updatedTenants);
    }

    res.status(200).send({ message: 'Favorites updated successfully', updatedTenants });

  } catch (error) {
    logger.error(`Error occurred while adding favorites: ${error.message}`);
    res.status(500).json({ status: false, message: 'Internal server error' });
  }
};
// Check Limited Count Calls 
exports.countCalls = async (req, res, next) => {
  try {
    logger.info(`API call: ${req.method} ${req.url}`);

    const { fsDomain, customerNumber } = req.body;

    // Validate required fields
    if (!fsDomain) {
      return res.status(400).send({ message: 'fsDomain is required' });
    }
    if (!customerNumber) {
      return res.status(400).send({ message: 'customer Number array is required' });
    }

    // Since only one customer number is passed, take the first element
    const number = customerNumber;

    // Fetch Customer call count from Redis
    const redisKey = `SAMA-COUNT:${fsDomain}:${number}`;
    const customerCallCountString = await redisClient.get(redisKey);
    if (!customerCallCountString) {
      return res.status(404).send({ message: 'No Customer Call Count data found' });
    }

    // Parse the stringified JSON
    let customerCallCount;
    try {
      customerCallCount = JSON.parse(customerCallCountString);
    } catch (error) {
      logger.error(`Error parsing Redis data: ${error.message}`);
      return res.status(500).send({ message: 'Invalid data format in Redis' });
    }

    // Format the date from "25_02_04" (YY_MM_DD) to "04-02-2025" (DD-MM-YYYY)
    const formattedDate = formatDateCall(customerCallCount.date);

    // Determine the message based on the count
    const countMessage = customerCallCount.count >= 10 ? "You have reached your call limit of 10 for this month." : "success";

    // Prepare the response
    const responseData = {
      customerNumber: number,
      count: customerCallCount.count,
      date: formattedDate,
      message: countMessage
    };

    res.status(200).send({
      message: 'Fetch Customer Call Count successfully',
      customerCallCount: responseData
    });

  } catch (error) {
    logger.error(`Error occurred while fetching customer call count: ${error.message}`);
    res.status(500).json({ status: false, message: 'Internal server error' });
  }
};
// Fetch Presence Status
exports.fetchPresenceStatus = async (req, res, next) => {
  try {
    logger.info(`API call: ${req.method} ${req.url}`);

    const { tenantId, fsExtension } = req.body;

    // Validate required fields
    if (!tenantId) {
      return res.status(400).send({ message: 'tenantId is required' });
    }
    if (!fsExtension) {
      return res.status(400).send({ message: 'Extension is required' });
    }

    // Fetch the hash data from Redis
    const redisKey = `TENANT_${tenantId}`;
    const extensionStatus = await redisClient.hgetall(redisKey);

    // Check if the object is empty
    if (Object.keys(extensionStatus).length === 0) {
      return res.status(404).send({ message: 'No Extension Status found' });
    }

    // Status mapping
    const statusMapping = {
      0: "UNAVAILABLE",
      1: "AVAILABLE",
      2: "RINGING",
      3: "DIALING",
      4: "ON_CALL",
      5: "ON_HOLD",
    };

    // Parse and transform the data
    const extensions = [];
    let activeCount = 0;
    let inactiveCount = 0;

    for (const [key, value] of Object.entries(extensionStatus)) {
      try {
        const extensionData = JSON.parse(value); // Parse the JSON string
        const status = parseInt(extensionData.status, 10) || 0;
        const currentStatus = statusMapping[status] || "UNKNOWN"; // Default to UNKNOWN if out of range

        extensions.push({
          agentId: key, // e.g., AGENT_404
          ...extensionData, // Spread the parsed data
          currentStatus, // Add mapped status
        });

        // Count active and inactive extensions
        if (status === 1) {
          activeCount++;
        } else {
          inactiveCount++;
        }
      } catch (error) {
        console.error(`Error parsing extension data for key ${key}:`, error);
      }
    }

    // Prepare the response
    const response = {
      message: 'Fetch Customer Call Count successfully',
      totalExtensions: extensions.length,
      activeExtensions: activeCount,
      inactiveExtensions: inactiveCount,
      extensions, // Array of parsed and formatted extension data
    };

    res.status(200).send(response);
  } catch (error) {
    logger.error(`Error fetching presence status: ${error.message}`);
    res.status(500).send({ message: 'Internal Server Error' });
  }
};







