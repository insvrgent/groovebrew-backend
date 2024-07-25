const { User } = require("../models");
const { io } = require("../index");

// [this is guestSide socketId, this is the code for qr]
const qrCodeSocketMap = {};

// this contain [userId, roleId, socketId]
const userList = [];

// [this is the clerkId, this is the clerk socketId, this is the guestSide socketId, this is the guestSide sessionId]
const guestSideList = [];

// Function to store QR code with shopId
function storeQRCode(socketId, qrCode) {
  qrCodeSocketMap[socketId] = [qrCode]; // Store qrCode and shopId in an array against socketId
}

// Function to get QR code by socketId
function getQRCodeBySocketId(socketId) {
  if (qrCodeSocketMap[socketId]) {
    return qrCodeSocketMap[socketId][0]; // Return qrCode stored at index 0
  }
  return null;
}

// Function to delete QR code by socketId
function deleteQRCodeBySocketId(socketId) {
  if (qrCodeSocketMap[socketId]) {
    const [qrCode] = qrCodeSocketMap[socketId];
    delete qrCodeSocketMap[socketId];
    return { qrCode };
  }
  return null;
}

// Function to get socketId and shopId by qrCode
function getSocketIdAndShopIdByQRCode(qrCode) {
  const socketId = Object.keys(qrCodeSocketMap).find(
    (socketId) => qrCodeSocketMap[socketId][0] === qrCode,
  );
  if (socketId) {
    return { socketId };
  }
  return null;
}

// Function to create guest side session
function createGuestSideSession(sessionDetails) {
  guestSideList.push(sessionDetails);
}

// Function to get all guest side sessions
function getGuestSideSessions() {
  return guestSideList;
}

// Function to delete guest side session by socketId
function deleteGuestSideSessionBySocketId(socketId) {
  const index = guestSideList.findIndex((session) => session[2] === socketId);
  if (index !== -1) {
    guestSideList.splice(index, 1);
  }
}

// Function to delete guest side session by guest side sessionId
function deleteGuestSideSessionByGuestSideSessionId(userId, sessionId) {
  const index = guestSideList.findIndex((session) => session[3] === sessionId);
  if (index !== -1) {
    if (guestSideList[index][0] != userId) return false;
    const previousGuestSideSocket = guestSideList[index][2];
    guestSideList.splice(index, 1);

    return { guestSideList, previousGuestSideSocket };
  } else return false;
}

// Function to update guest side socketId by sessionCode
function updateGuestSideSocketId(sessionCode, newSocketId) {
  const session = guestSideList.find((session) => session[3] === sessionCode);
  if (session) {
    session[2] = newSocketId;
    return true;
  }
  return false;
}

// Function to update clerk socketId by clerkId
// function updateClerkSocketId(clerkId, newSocketId) {
//   const session = guestSideList.find((session) => session[0] === clerkId);
//   if (session) {
//     session[1] = newSocketId;
//     return true;
//   }
//   return false;
// }

async function updateUserSocketId(user, newSocketId) {
  try {
    const { userId, roleId, cafeId } = user;

    //for clerk identifying
    if (roleId == 2) userList.push([userId, roleId, newSocketId, cafeId]);
    else userList.push([userId, roleId, newSocketId, null]);

    console.log(
      `User with socketId ${newSocketId} found and added to userList.`,
    );
    if (roleId == 2) {
      const session = guestSideList.find((session) => session[0] === clerkId);
      if (session) {
        session[1] = newSocketId;
      }
    }
  } catch (error) {
    console.error("Error finding user:", error);
    return false;
  }
}

function getAllClerk(cafeId) {
  return userList.filter((user) => user[3] === cafeId);
}

function sendMessageToAllClerk(cafeId, data) {
  // Step 1: Filter userList to get users (clerks) with the specified cafeId
  const shopClerks = userList.filter((user) => user[3] === cafeId);

  // Step 2 & 3: Iterate over filtered users and send data through their socketId
  shopClerks.forEach((user) => {
    const socketId = user[2]; // Get the socketId from the user data
    console.log(`Sending data to user with socketId ${socketId}`);
    io.to(socketId).emit(data); // Emit data to the socketId using Socket.io
  });
}

// Function to get session by guest side sessionId
function getSessionByGuestSideSessionId(sessionId) {
  return guestSideList.find((session) => session[3] === sessionId);
}

// Function to verify guest side session and return its data
async function verifyGuestSideSession(sessionCode, newSocketId) {
  const session = guestSideList.find((session) => session[3] === sessionCode);

  if (session) {
    const user = await User.findByPk(session[0]);
    if (user) {
      console.log(user);
      session[2] = newSocketId;
      session[4] = user.username;
      console.log("updating guest side socket");

      return session
        ? {
            clerkId: session[0],
            clerkSocketId: session[1],
            guestSideSocketId: session[2],
            sessionId: session[3],
            clerkUsername: session[4],
            shopId: user.cafeId,
          }
        : null;
    }

    return null;
  } else return null;
}

// Function to get all sessions by clerkId
function getSessionsByClerkId(clerkId) {
  return guestSideList.filter((session) => session[0] === clerkId);
}

// Export all functions and variables
module.exports = {
  storeQRCode,
  getQRCodeBySocketId,
  deleteQRCodeBySocketId,
  getSocketIdAndShopIdByQRCode,
  createGuestSideSession,
  getGuestSideSessions,
  deleteGuestSideSessionBySocketId,
  deleteGuestSideSessionByGuestSideSessionId, // Export the new function
  updateGuestSideSocketId,
  updateUserSocketId,
  getAllClerk,
  sendMessageToAllClerk,
  getSessionByGuestSideSessionId,
  verifyGuestSideSession,
  getSessionsByClerkId,
  qrCodeSocketMap, // Export for testing or debugging purposes if needed
  guestSideList, // Export for testing or debugging purposes if needed
};
