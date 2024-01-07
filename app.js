const express = require('express');
const { Pool } = require('pg');
const bodyParser = require('body-parser');
const cors = require('cors');
const nodemailer = require('nodemailer');
require('dotenv').config();


const port = process.env.PORT || 3000;
const app = express();

app.use(bodyParser.json());
app.use(cors());

// PostgreSQL database configuration
 /* const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  ssl: {
    rejectUnauthorized: false,
  },
});  */

 const connectionString = process.env.DB_URL;

// Create a connection pool
  const pool = new Pool({
    connectionString: connectionString,
    ssl: {
      rejectUnauthorized: false
  }
});
 

const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,// replace with your email password
  },
  tls: {
    rejectUnauthorized: false,
  },
});

async function sendThankYouEmail(formData) {
  const mailOptions = {
    from: 'edmasawi@ymail.com',
    to: formData.email,
    subject: 'Thank you for your donation!',
    text: `Dear ${formData.firstName},\n\nI hope this message finds you in good spirits. We wanted to take a moment to express our heartfelt gratitude for your generous donation to the Open Heart Foundation. Your support means the world to us and will make a significant impact on the lives of homeless women and children in our community.\n\nThank you for your kindness and generosity. Together, we are creating a brighter future for those in need.\n\nWarm regards`,
  };

  return transporter.sendMail(mailOptions);
}


app.post('/submit-form', async (req, res) => {
  const formData = req.body;
  const query =
    'INSERT INTO details (first_name, last_name, email, amount, email_updates) VALUES ($1, $2, $3, $4, $5)';
  const values = [
    formData.firstName,
    formData.lastName,
    formData.email,
    formData.amount,
    formData.emailUpdates,
  ];

 

  try {
    await pool.query(query, values);
    res.json({
      success: true,
      message: 'Form data submitted successfully',
    });
  } catch (error) {
    console.error('Error executing query', error);
    res
      .status(500)
      .json({
        success: false,
        message: 'Internal server error',
        error: error.message,
      });
  }
});


app.post('/capture-payment', async (req, res) => {
  const formData = req.body;
  const query =
      'INSERT INTO details (first_name, last_name, email, amount, email_updates) VALUES ($1, $2, $3, $4, $5)';
  const values = [
      formData.firstName,
      formData.lastName,
      formData.email,
      formData.amount,
      formData.emailUpdates,
  ];

  try {
      await pool.query(query, values);

      // Send email after successful payment
      await sendThankYouEmail(formData);

      // Get updated donation count and total amount
      const donationCountQuery = 'SELECT COUNT(*) FROM details';
      const totalAmountQuery = 'SELECT COALESCE(SUM(amount), 0) FROM details';
      const [donationCountResult, totalAmountResult] = await Promise.all([
          pool.query(donationCountQuery),
          pool.query(totalAmountQuery),
      ]);

      const donationCount = donationCountResult.rows[0].count;
      const totalAmount = parseFloat(totalAmountResult.rows[0].coalesce);

      res.json({
          success: true,
          message: 'Payment and form data captured successfully',
          donationCount,
          totalAmount,
      });
  } catch (error) {
      console.error('Error capturing form data', error);
      res.status(500).json({
          success: false,
          message: 'Internal server error',
          error: error.message,
      });
  }
});

app.get('/test-database-connection', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() AS current_time');
    const currentTime = result.rows[0].current_time;

    res.json({
      success: true,
      message: 'Database connection successful',
      currentTime,
    });
  } catch (error) {
    console.error('Error testing database connection', error);
    res.status(500).json({
      success: false,
      message: 'Database connection error',
      error: error.message,
    });
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
