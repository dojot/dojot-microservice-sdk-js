/**
 * A helper function to get the current
 * status of a given consumer or producer
 * @param {*} kafkaObject The kafka Object to get
 * the metadata Consumer or Producer (required)
 * @param {*} timeout Timeout to get the status (optional)
 */
const getStatus = (kafkaObject, timeout = 3000) => new Promise((resolve) => {
  const objectStatus = { connected: false };
  kafkaObject.getMetadata({ timeout }, (err) => {
    if (err) {
      resolve(objectStatus);
    } else {
      objectStatus.connected = true;
      resolve(objectStatus);
    }
  });
});

module.exports = { getStatus };
