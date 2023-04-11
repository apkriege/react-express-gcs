# react-express-gcs
Simple react app sends a file to the backend, scans the file for viruses, and uploads the file to GCS bucket

## To Start
1. Open two terminals and navigate to client and server directories respectivley 
2. Run <code>npm start</code>
3. Login to your gcloud account via the CLI, this will act as the user to connect to GCP


#### Notes
- You will need to set up ClamAV either locally or through a TCP connection https://github.com/kylefarris/clamscan
- Tips how to install https://gist.github.com/gagarine/9168c1b7e4b5f55cb3254582e30d808e
