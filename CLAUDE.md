# BrainRouter

# AI Decision Layer Project

## Overview
This project is a full-stack web application that acts as an "AI Decision Layer".

It takes a user prompt, sends it to multiple AI models via OpenRouter API, compares responses, ranks them, and displays the best answer.

---

## Tech Stack
- Backend: Java Spring Boot
- Frontend: HTML + JavaScript (simple UI)
- Database: MongoDB Atlas
- API Provider: OpenRouter

---

## Core Features
1. Accept user prompt via UI
2. Call multiple AI models:
   - deepseek/deepseek-chat
   - mistralai/mistral-7b
   - meta-llama/llama-3 (optional)
3. Extract response text from JSON:
   - choices[0].message.content
4. Score responses based on:
   - length > 200 → +2
   - contains "example" → +2
   - contains "step" → +2
5. Rank responses
6. Return:
   - model name
   - response text
   - score
   - best flag

---

## User Experience Features
- Login / Signup functionality
- “Get Started” landing screen after login
- Sidebar navigation for:
  - Home
  - Compare AI
  - Chat
  - History (optional)
- Persistent user data using MongoDB Atlas

---

## Backend Requirements
- REST endpoint: POST /ai/compare
- Input:
  {
    "prompt": "string"
  }

- Output:
  {
    "responses": [
      {
        "model": "DeepSeek",
        "text": "...",
        "score": 8,
        "best": true
      }
    ]
  }

---

## API Details
- Endpoint: https://openrouter.ai/api/v1/chat/completions
- Auth: Bearer token
- Use environment variable for API key (OPENROUTER_API_KEY)
- Do NOT hardcode API key

---

## Frontend Requirements
- Input box
- Submit button
- Display responses in cards
- Highlight best response with ⭐
- Show model name and score

### Additional UI Components
- Login / Signup page
- “Get Started” dashboard
- Sidebar navigation panel
- Chat window (opens when user clicks "Chat")

---

## Chat Feature
- Dedicated chat interface
- Opens dynamically on user click
- Allows conversational interaction with selected AI model
- Can reuse same backend API with session context

---

## Localization (Speech-to-Text)
- Support speech-to-text input
- Support multiple Indian languages:
  - Hindi
  - Telugu
  - Tamil
  - Kannada
  - etc.
- Convert voice → text → send to AI models

---

## Database (MongoDB Atlas)
- Store:
  - User credentials (login/signup)
  - Prompt history
  - Responses (optional)
- Use MongoDB Atlas for cloud storage

---

## Coding Guidelines
- Modular code (separate service for API calls)
- Proper error handling
- Clean JSON parsing (Jackson)
- Avoid duplication
- Use Java 17+

---

## Bonus Features (if time)
- Response time per model
- Loading spinner
- Third model integration
- Improved UI styling
- Save chat history

---

## Goal
Deliver a working MVP suitable for hackathon demo:
- Clean UI
- Multi-model comparison
- Best answer highlighted
- Smooth user experience with login and chat