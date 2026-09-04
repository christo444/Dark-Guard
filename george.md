# Extension Integration Guide
**Prepared for:** George (Student 3 - Chrome Extension / Frontend)

---

## 1. Goal
Your job is to extract text from shopping websites (using a `MutationObserver` and Content Scripts in your Manifest V3 extension) and send it to the FastAPI backend. The backend will use our trained BERT model to identify dark patterns, and send the results back to you so you can highlight them on the page.

---

## 2. API Connection Details

The backend is currently running a local server. You can test your extension against this endpoint:

**Endpoint URL:**  
`POST http://localhost:8000/predict`

**Headers Required:**  
```javascript
{
  "Content-Type": "application/json"
}
```

---

## 3. How to send data (Request Format)

When you scrape text from the DOM, gather the strings into an array. Do not send every single word individually; send them in batches (e.g., all the text from a specific `<div>` or popup).

Here is the exact JSON structure you need to send in the body of your `fetch` request:

```json
{
  "texts": [
    "Hurry up, only 2 left in stock!",
    "Sign up to our newsletter for updates."
  ]
}
```

**JavaScript Example:**
```javascript
async function checkDarkPatterns(scrapedTextsArray) {
    const response = await fetch("http://localhost:8000/predict", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ texts: scrapedTextsArray })
    });
    
    const data = await response.json();
    return data.results;
}
```

---

## 4. How to read the results (Response Format)

The API will return an array of results that matches the order of the texts you sent. 

```json
{
  "results": [
    {
      "text": "Hurry up, only 2 left in stock!",
      "is_dark_pattern": true,
      "category": "Scarcity",
      "confidence": 0.991
    },
    {
      "text": "Sign up to our newsletter for updates.",
      "is_dark_pattern": false,
      "category": "Not Dark Pattern",
      "confidence": 0.993
    }
  ]
}
```

### What you should do with this data:
1. Loop through the `results` array.
2. If `is_dark_pattern` is `true`:
   * Find that specific `text` in the webpage DOM.
   * Highlight it (e.g., wrap it in a `<span style="background-color: yellow;">`).
   * Add a hover tooltip that displays the `category` (e.g., "Warning: Scarcity tactic detected") and the `confidence` score.
