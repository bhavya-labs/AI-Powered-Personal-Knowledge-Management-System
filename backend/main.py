from fastapi import FastAPI, UploadFile, File, Header, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pypdf import PdfReader
from transformers import pipeline
from sentence_transformers import SentenceTransformer
import faiss
import numpy as np
import shutil
import os
import json
import uuid
import hashlib
import requests
from datetime import datetime
from io import BytesIO
from typing import Optional, List, Dict, Any

app = FastAPI(title="MindMesh AI Backend")

# CORS Setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_FOLDER = "../uploads"
METADATA_FILE = os.path.join(UPLOAD_FOLDER, "metadata.json")
CHUNKS_FILE = os.path.join(UPLOAD_FOLDER, "chunks.json")
INDEX_FILE = os.path.join(UPLOAD_FOLDER, "index.faiss")
EMBEDDINGS_FILE = os.path.join(UPLOAD_FOLDER, "embeddings.npy")
CHATS_FILE = os.path.join(UPLOAD_FOLDER, "chats.json")

# Global variables
document_registry: Dict[str, Any] = {}
document_chunks: List[Dict[str, Any]] = []
document_embeddings: List[List[float]] = []
index: Optional[faiss.IndexFlatL2] = None
chat_history: Dict[str, Any] = {}

# Model loading references (Lazy loaded to optimize RAM & startup time)
_summarizer = None
_chatbot = None
_embedding_model = None

def get_summarizer():
    global _summarizer
    if _summarizer is None:
        print("Loading local summarization model (BART)...")
        _summarizer = pipeline("summarization", model="facebook/bart-large-cnn")
    return _summarizer

def get_chatbot():
    global _chatbot
    if _chatbot is None:
        print("Loading local chatbot model (Flan-T5)...")
        _chatbot = pipeline("text2text-generation", model="google/flan-t5-base")
    return _chatbot

def get_embedding_model():
    global _embedding_model
    if _embedding_model is None:
        print("Loading local embedding model (SentenceTransformers)...")
        _embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
    return _embedding_model

# Persistence helpers
def save_data():
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
    with open(METADATA_FILE, "w") as f:
        json.dump(document_registry, f, indent=2)
    with open(CHUNKS_FILE, "w") as f:
        json.dump(document_chunks, f, indent=2)
    with open(CHATS_FILE, "w") as f:
        json.dump(chat_history, f, indent=2)
        
    if index is not None and len(document_embeddings) > 0:
        faiss.write_index(index, INDEX_FILE)
        np.save(EMBEDDINGS_FILE, np.array(document_embeddings).astype("float32"))
    else:
        if os.path.exists(INDEX_FILE):
            os.remove(INDEX_FILE)
        if os.path.exists(EMBEDDINGS_FILE):
            os.remove(EMBEDDINGS_FILE)

def load_data():
    global document_registry, document_chunks, document_embeddings, index, chat_history
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
    if os.path.exists(METADATA_FILE):
        try:
            with open(METADATA_FILE, "r") as f:
                document_registry.update(json.load(f))
        except Exception as e:
            print(f"Error loading metadata: {e}")
    if os.path.exists(CHUNKS_FILE):
        try:
            with open(CHUNKS_FILE, "r") as f:
                document_chunks.extend(json.load(f))
        except Exception as e:
            print(f"Error loading chunks: {e}")
    if os.path.exists(EMBEDDINGS_FILE):
        try:
            embeddings_array = np.load(EMBEDDINGS_FILE)
            document_embeddings.extend(embeddings_array.tolist())
        except Exception as e:
            print(f"Error loading embeddings: {e}")
    if os.path.exists(INDEX_FILE):
        try:
            index = faiss.read_index(INDEX_FILE)
        except Exception as e:
            print(f"Error loading FAISS index: {e}")
    if os.path.exists(CHATS_FILE):
        try:
            with open(CHATS_FILE, "r") as f:
                chat_history.update(json.load(f))
        except Exception as e:
            print(f"Error loading chats: {e}")

# Load persistent data at startup
load_data()

# Gemini API call helper
def call_gemini_api(prompt: str, api_key: str, system_instruction: str = None) -> str:
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
    headers = {"Content-Type": "application/json"}
    
    contents = [{"parts": [{"text": prompt}]}]
    payload = {"contents": contents}
    
    if system_instruction:
        payload["systemInstruction"] = {
            "parts": [{"text": system_instruction}]
        }
        
    response = requests.post(url, json=payload, headers=headers, timeout=30)
    response.raise_for_status()
    data = response.json()
    return data["candidates"][0]["content"]["parts"][0]["text"]

# API Request Models
class ChatRequest(BaseModel):
    question: str
    doc_id: Optional[str] = None

class SearchRequest(BaseModel):
    query: str
    doc_id: Optional[str] = None

class ChatMessage(BaseModel):
    sender: str  # "user" or "ai"
    text: str
    sources: Optional[List[Dict[str, Any]]] = None
    timestamp: str

class CreateChatRequest(BaseModel):
    title: str

# Routes
@app.get("/")
def home():
    return {
        "message": "MindMesh AI Backend Running",
        "status": "online",
        "active_documents": len(document_registry)
    }

@app.get("/stats")
def get_stats():
    total_docs = len(document_registry)
    total_chunks = len(document_chunks)
    total_pages = sum(d.get("pages", 0) for d in document_registry.values())
    return {
        "documents": total_docs,
        "chunks": total_chunks,
        "pages": total_pages
    }

@app.get("/documents")
def list_documents():
    docs = list(document_registry.values())
    docs.sort(key=lambda x: x.get("uploaded_at", ""), reverse=True)
    return docs

@app.delete("/documents/{doc_id}")
def delete_document(doc_id: str):
    global index, document_chunks, document_embeddings
    
    if doc_id not in document_registry:
        return {"error": "Document not found"}, 404
        
    doc_info = document_registry[doc_id]
    filename = doc_info["filename"]
    
    file_path = os.path.join(UPLOAD_FOLDER, filename)
    if os.path.exists(file_path):
        try:
            os.remove(file_path)
        except Exception as e:
            print(f"Error removing file {file_path}: {e}")
            
    # Filter chunks and embeddings
    new_chunks = []
    new_embeddings = []
    
    for chunk, emb in zip(document_chunks, document_embeddings):
        if chunk.get("doc_id") != doc_id:
            new_chunks.append(chunk)
            new_embeddings.append(emb)
            
    document_chunks = new_chunks
    document_embeddings = new_embeddings
    
    # Rebuild index
    if len(document_embeddings) > 0:
        embedding_array = np.array(document_embeddings).astype("float32")
        dimension = embedding_array.shape[1]
        index = faiss.IndexFlatL2(dimension)
        index.add(embedding_array)
    else:
        index = None
        
    del document_registry[doc_id]
    save_data()
    
    return {
        "message": f"Document {filename} deleted successfully",
        "doc_id": doc_id
    }

@app.post("/upload")
async def upload_pdf(
    file: UploadFile = File(...),
    x_gemini_api_key: Optional[str] = Header(None)
):
    global index
    
    file_content = await file.read()
    content_hash = hashlib.md5(file_content).hexdigest()
    doc_id = f"doc_{content_hash[:12]}"
    
    if doc_id in document_registry:
        return {
            "message": "Document already uploaded and indexed",
            "doc_id": doc_id,
            "filename": file.filename,
            "summary": document_registry[doc_id]["summary"],
            "already_exists": True,
            "pages": document_registry[doc_id]["pages"],
            "size": document_registry[doc_id]["size"]
        }
        
    file_path = os.path.join(UPLOAD_FOLDER, file.filename)
    with open(file_path, "wb") as buffer:
        buffer.write(file_content)
        
    reader = PdfReader(BytesIO(file_content))
    pages_text = []
    extracted_text = ""
    
    for i, page in enumerate(reader.pages):
        text = page.extract_text()
        if text:
            pages_text.append((i + 1, text))
            extracted_text += text + "\n"
            
    if not extracted_text.strip():
        return {"error": "No text could be extracted from this PDF"}
        
    # Generate summary (Gemini or BART)
    summary_text = ""
    if x_gemini_api_key:
        try:
            prompt = f"Please summarize the following document text in 2-3 concise paragraphs, highlighting its main purpose, key insights, and actionable items:\n\n{extracted_text[:6000]}"
            summary_text = call_gemini_api(
                prompt=prompt,
                api_key=x_gemini_api_key,
                system_instruction="You are a professional document analysis system. Provide structural and clear summaries."
            )
        except Exception as e:
            print(f"Failed to summarize using Gemini API, falling back to local model: {e}")
            
    if not summary_text:
        try:
            local_summarizer = get_summarizer()
            text_for_summary = extracted_text[:2000]
            summary = local_summarizer(
                text_for_summary,
                max_length=150,
                min_length=50,
                do_sample=False
            )
            summary_text = summary[0]["summary_text"]
        except Exception as e:
            summary_text = f"Extracted text preview: {extracted_text[:300]}..."
            print(f"Error with local summarization: {e}")
            
    # Chunking by page to track sources
    chunks_list = []
    for page_num, page_content in pages_text:
        if not page_content.strip():
            continue
        paragraphs = page_content.split("\n\n")
        current_chunk = ""
        for para in paragraphs:
            para = para.strip()
            if not para:
                continue
            if len(current_chunk) + len(para) < 800:
                current_chunk += "\n" + para if current_chunk else para
            else:
                if current_chunk:
                    chunks_list.append({
                        "text": current_chunk,
                        "filename": file.filename,
                        "doc_id": doc_id,
                        "page": page_num
                    })
                overlap = current_chunk[-150:] if len(current_chunk) > 150 else ""
                current_chunk = (overlap + "\n" + para) if overlap else para
        if current_chunk:
            chunks_list.append({
                "text": current_chunk,
                "filename": file.filename,
                "doc_id": doc_id,
                "page": page_num
            })
            
    if not chunks_list:
        chunks_list.append({
            "text": extracted_text[:1000],
            "filename": file.filename,
            "doc_id": doc_id,
            "page": 1
        })
        
    # Generate embeddings
    local_embedder = get_embedding_model()
    chunk_texts = [c["text"] for c in chunks_list]
    new_embeddings = local_embedder.encode(chunk_texts)
    
    document_chunks.extend(chunks_list)
    document_embeddings.extend(new_embeddings.tolist())
    
    embedding_array = np.array(document_embeddings).astype("float32")
    dimension = embedding_array.shape[1]
    
    index = faiss.IndexFlatL2(dimension)
    index.add(embedding_array)
    
    document_registry[doc_id] = {
        "doc_id": doc_id,
        "filename": file.filename,
        "size": len(file_content),
        "pages": len(reader.pages),
        "uploaded_at": datetime.now().isoformat(),
        "summary": summary_text
    }
    
    save_data()
    
    return {
        "doc_id": doc_id,
        "filename": file.filename,
        "text_preview": extracted_text[:1000],
        "summary": summary_text,
        "pages": len(reader.pages),
        "size": len(file_content)
    }

@app.post("/search")
async def semantic_search(
    request: Optional[SearchRequest] = None,
    query: Optional[str] = Query(None),
    doc_id: Optional[str] = Query(None)
):
    global index
    
    q = request.query if request else query
    d_id = request.doc_id if request else doc_id
    
    if not q:
        return {"error": "Query is required"}
        
    if index is None:
        return {"results": []}
        
    local_embedder = get_embedding_model()
    query_embedding = local_embedder.encode([q])
    
    search_k = min(30, len(document_chunks))
    distances, indices = index.search(
        np.array(query_embedding).astype("float32"),
        k=search_k
    )
    
    results = []
    for idx, dist in zip(indices[0], distances[0]):
        if idx < len(document_chunks):
            chunk = document_chunks[idx]
            if d_id and chunk.get("doc_id") != d_id:
                continue
            
            score = float(1 / (1 + dist))
            results.append({
                "text": chunk["text"],
                "filename": chunk["filename"],
                "page": chunk["page"],
                "doc_id": chunk["doc_id"],
                "score": score
            })
            if len(results) >= 5:
                break
                
    return {"results": results}

@app.post("/chat")
async def chat_with_documents(
    request: Optional[ChatRequest] = None,
    question: Optional[str] = Query(None),
    doc_id: Optional[str] = Query(None),
    x_gemini_api_key: Optional[str] = Header(None)
):
    global index
    
    q = request.question if request else question
    d_id = request.doc_id if request else doc_id
    
    if not q:
        return {"error": "Question is required"}
        
    if index is None:
        return {"error": "No documents uploaded yet. Please upload a PDF first."}
        
    local_embedder = get_embedding_model()
    question_embedding = local_embedder.encode([q])
    
    search_k = min(30, len(document_chunks))
    distances, indices = index.search(
        np.array(question_embedding).astype("float32"),
        k=search_k
    )
    
    context_chunks = []
    sources = []
    
    for idx, dist in zip(indices[0], distances[0]):
        if idx < len(document_chunks):
            chunk = document_chunks[idx]
            if d_id and chunk.get("doc_id") != d_id:
                continue
            context_chunks.append(chunk["text"])
            sources.append({
                "filename": chunk["filename"],
                "page": chunk["page"],
                "doc_id": chunk["doc_id"]
            })
            if len(context_chunks) >= 4:
                break
                
    if not context_chunks:
        return {
            "question": q,
            "answer": "I couldn't find any relevant chunks in the selected document to answer your question.",
            "sources": []
        }
        
    context = "\n\n".join(context_chunks)
    
    prompt = f"""Use the following pieces of context to answer the user's question. If you do not know the answer or if the context does not contain the answer, say "I cannot find the answer in the provided documents." Do not try to make up an answer.

Context:
{context}

Question:
{q}

Answer:"""

    answer = ""
    if x_gemini_api_key:
        try:
            answer = call_gemini_api(
                prompt=prompt,
                api_key=x_gemini_api_key,
                system_instruction="You are MindMesh AI, an advanced document intelligence assistant. Answer the user's question accurately using only the provided context. Be professional and detailed."
            )
        except Exception as e:
            print(f"Gemini API chat failed, falling back to local LLM: {e}")
            
    if not answer:
        try:
            local_chatbot = get_chatbot()
            response = local_chatbot(prompt, max_length=300)
            answer = response[0]["generated_text"]
        except Exception as e:
            answer = f"Error generating answer locally: {e}. If this is a CPU memory issue, please configure a Gemini API key in Settings."
            print(f"Local chat generation error: {e}")
            
    unique_sources = []
    seen = set()
    for s in sources:
        key = (s["doc_id"], s["page"])
        if key not in seen:
            seen.add(key)
            unique_sources.append(s)
            
    return {
        "question": q,
        "answer": answer,
        "sources": unique_sources
    }

# Chat persistence endpoints
@app.get("/chats")
def list_chats():
    result = []
    for chat_id, chat in chat_history.items():
        result.append({
            "chat_id": chat_id,
            "title": chat["title"],
            "created_at": chat["created_at"]
        })
    result.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return result

@app.get("/chats/{chat_id}")
def get_chat(chat_id: str):
    if chat_id not in chat_history:
        return {"error": "Chat session not found"}, 404
    return chat_history[chat_id]

@app.post("/chats")
def create_chat(request: CreateChatRequest):
    chat_id = f"chat_{uuid.uuid4().hex[:12]}"
    chat_history[chat_id] = {
        "chat_id": chat_id,
        "title": request.title,
        "created_at": datetime.now().isoformat(),
        "messages": []
    }
    save_data()
    return chat_history[chat_id]

@app.post("/chats/{chat_id}/messages")
def add_chat_message(chat_id: str, message: ChatMessage):
    if chat_id not in chat_history:
        return {"error": "Chat session not found"}, 404
    chat_history[chat_id]["messages"].append(message.model_dump())
    save_data()
    return {"status": "success", "chat_id": chat_id}

@app.delete("/chats/{chat_id}")
def delete_chat(chat_id: str):
    if chat_id not in chat_history:
        return {"error": "Chat session not found"}, 404
    del chat_history[chat_id]
    save_data()
    return {"status": "success", "message": f"Chat session {chat_id} deleted"}