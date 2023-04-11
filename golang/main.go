package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"time"

	"cloud.google.com/go/storage"
)

type Message struct {
	Text string `json:"text"`
}

const bucketName = "test-bucket-pixo"

func main() {
	http.HandleFunc("/hello", helloHandler)
	http.HandleFunc("/upload", uploadHandler)
	log.Fatal(http.ListenAndServe(":8001", nil))
}

func helloHandler(w http.ResponseWriter, r *http.Request) {
	message := Message{Text: "Hello, World!"}
	json.NewEncoder(w).Encode(message)
}

func uploadHandler(w http.ResponseWriter, r *http.Request) {
	// Check if the request method is POST
	start := time.Now()

	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	// Parse the multipart form data
	err := r.ParseMultipartForm(8 << 20) // 8 MB
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		fmt.Fprint(w, "Error parsing multipart form data")
		return
	}

	// Get the file from the request
	file, header, err := r.FormFile("file")
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		fmt.Fprint(w, "Error getting file from request")
		return
	}
	defer file.Close()

	// Upload the file to GCS
	ctx := context.Background()
	client, err := storage.NewClient(ctx)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		fmt.Fprint(w, "Error creating GCS client")
		return
	}

	wc := client.Bucket(bucketName).Object(header.Filename).NewWriter(ctx)
	if _, err := io.Copy(wc, file); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		fmt.Fprint(w, "Error uploading file to GCS")
		return
	}

	if err := wc.Close(); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		fmt.Fprint(w, "Error uploading file to GCS")
		return
	}

	// Return a success message
	w.WriteHeader(http.StatusOK)

	elapsed := time.Since(start)
	log.Printf("File uplaod took %s", elapsed)

	fmt.Fprint(w, "File uploaded successfully")
}
