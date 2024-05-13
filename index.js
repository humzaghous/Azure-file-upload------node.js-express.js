const express = require('express');
const multer = require('multer');
const azure = require('azure-storage');
const { Pool } = require('pg');

const app = express();
const upload = multer({ dest: 'uploads/' });

// PostgreSQL configuration
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'hamza',
    password: 'HUMZAG',
    port: 5432,
});

// Create "files" table if it doesn't exist
pool.query(`
    CREATE TABLE IF NOT EXISTS files (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        url VARCHAR(255) NOT NULL
    )
`).then(() => {
    console.log('Table "files" created successfully');
}).catch(error => {
    console.error('Error creating table:', error);
});

// Azure Blob Storage configuration
const connectionString = 'DefaultEndpointsProtocol=https;AccountName=datauploadnode;AccountKey=p+0UJVlDIHRpbAQ1qK9BtjDXeBeRX53DkBkasAVGTA83ZeakDbvTDNb/FzFVc0+ERMQtZ33Xhwd2+AStoAsudQ==;EndpointSuffix=core.windows.net';
const blobService = azure.createBlobService(connectionString);

// File upload endpoint
app.post('/upload', upload.single('file'), (req, res) => {
    try {
        const file = req.file;

        // Upload file to Azure Blob Storage
        const blobName = file.originalname;
        const stream = require('fs').createReadStream(file.path);
        blobService.createBlockBlobFromStream('dataintern', blobName, stream, file.size, (error) => {
            if (error) {
                console.log('Error uploading file to Azure Blob Storage:', error);
                return res.status(500).send('Error uploading file');
            }

            // Store file metadata in PostgreSQL
            const query = 'INSERT INTO files (name, url) VALUES ($1, $2)';
            const values = [blobName, blobService.getUrl('dataintern', blobName)];
            pool.query(query, values, (error) => {
                if (error) {
                    console.log('Error storing file metadata in PostgreSQL:', error);
                    return res.status(500).send('Error storing file metadata');
                }

                // Delete the temporary file from the server
                require('fs').unlink(file.path, (error) => {
                    if (error) {
                        console.log('Error deleting temporary file:', error);
                    }
                });

                return res.status(200).send('File uploaded successfully');
            });
        });
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).send('Internal server error');
    }
});

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});

// testing URl
//POSt http://localhost:3000/upload
//Body form-data key file value select file