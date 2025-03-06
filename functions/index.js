const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios = require("axios");

// Initialize admin if not already initialized
admin.initializeApp();

// Fetch new books function (HTTP triggered instead of scheduled)
exports.fetchNewBooks = functions.https.onRequest(async (request, response) => {
    try {
        console.log("Starting to fetch new books");
        
        // Calculate date 3 months ago for recent books
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        const dateString = threeMonthsAgo.toISOString().split("T")[0];
        
        // Fetch from Google Books API
        const googleResponse = await axios.get(
            "https://www.googleapis.com/books/v1/volumes",
            {
                params: {
                    q: `publishedDate:>${dateString}`,
                    orderBy: "newest",
                    maxResults: 40,
                },
            },
        );
        
        // Process and store in Firestore
        const db = admin.firestore();
        const batch = db.batch();
        
        console.log(
            `Found ${googleResponse.data.items.length} new books from Google`,
        );
        
        // Add Google books
        googleResponse.data.items.forEach((item) => {
            if (item.volumeInfo) {
                const docRef = db.collection("new_releases").doc();
                batch.set(docRef, {
                    title: item.volumeInfo.title,
                    author: item.volumeInfo.authors
                        ? item.volumeInfo.authors.join(", ")
                        : "Unknown",
                    description: item.volumeInfo.description || "",
                    coverURL: 
                        item.volumeInfo.imageLinks?.thumbnail || null,
                    publisher: item.volumeInfo.publisher,
                    isbn: 
                        item.volumeInfo.industryIdentifiers?.[0]?.identifier || 
                        null,
                    publicationDate: item.volumeInfo.publishedDate,
                    source: "google_books",
                    isNewRelease: true,
                    timestamp: admin.firestore.FieldValue.serverTimestamp(),
                });
            }
        });
        
        await batch.commit();
        console.log("Successfully updated new releases collection");
        
        // Send success response
        response.status(200).send({
            success: true,
            message: "Successfully fetched and stored new books",
            count: googleResponse.data.items.length,
        });
    } catch (error) {
        console.error("Error fetching books:", error);
        response.status(500).send({
            success: false,
            message: "Error fetching books",
            error: error.message,
        });
    }
});