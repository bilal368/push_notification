require('dotenv').config();
const { app } = require('./app'); // Import both `app` and `server`

const PORT = process.env.PORT || 5009;

app.listen(PORT, () => {  // ✅ Change `app.listen` to `server.listen`
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
