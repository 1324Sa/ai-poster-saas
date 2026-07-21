# 🎨 AI Poster Generator & Interactive Canvas Editor (SaaS Platform)

A full-stack, enterprise-ready **AI Poster Generation and Interactive Canvas Editor** SaaS platform. This application allows users to design, customize, and generate high-resolution posters seamlessly using a feature-rich interactive canvas, custom image filters, CORS proxying, freehand drawing, and flexible asset integration.

---

## 🚀 Key Features

### 🖼️ Interactive Fabric.js Canvas Editor
- **Dynamic Text Elements**: Add editable text objects with real-time color pickers and typography customization.
- **Freehand Hand-Drawing**: Built-in drawing mode powered by `fabric.PencilBrush` with dynamic brush color and stroke size controls.
- **7 Image Processing Filters**: Apply real-time visual filters to selected images on the canvas:
  - *Grayscale*, *Sepia*, *Invert*, *Blur*, *Pixelate*, *High Contrast*, and *Brightness adjustment*.
- **Smart Image Cropping**: Precision image crop tools for custom aspect ratios and framed object alignments.
- **Emoji Picker Integration**: Native emoji input system integrated directly into canvas vector objects.
- **Dual Image Sourcing**: Upload local images directly from device storage or fetch remote web images via a secure backend proxy.
- **Undo / Redo History Engine**: State preservation mechanism (`historyRef`) capturing every object modification, addition, or path creation for instant rollbacks.
- **High-Resolution Export**: One-click client-side rendering and PNG download with full multiplier scaling.

### ⚡ Robust Backend & Architecture
- **FastAPI Core**: High-performance, asynchronous Python backend API.
- **CORS Proxying Service**: Custom proxy endpoint (`/api/v1/proxy-image`) to securely fetch external images and bypass Cross-Origin Resource Sharing (CORS) restrictions on the canvas.
- **Asynchronous Task Queue**: Integrated **Celery** and **Redis** task infrastructure for handling heavy image rendering and background AI processing pipeline workloads.
- **Environment Isolation**: Fully configurable environment variable handling (`python-dotenv` & Next.js environment mapping).

---

## 🛠️ Tech Stack & Technologies

### **Frontend**
- **Framework**: Next.js 14+ (React 18 / TypeScript)
- **Interactive Canvas Engine**: Fabric.js (v6)
- **Styling**: Tailwind CSS
- **Icons & UI Utilities**: `emoji-picker-react`

### **Backend**
- **Framework**: FastAPI (Python 3.10+)
- **Async Server**: Uvicorn
- **Task Queue & Broker**: Celery + Redis
- **HTTP Client / Proxy**: Requests / HTTPX

### **Deployment & Infrastructure**
- **Frontend Hosting**: Vercel
- **Backend Hosting**: Render
- **Version Control**: GitHub CI/CD integrations

---

## 🏗️ Architecture Overview

```text
+-----------------------------------------------------------------------+
|                            Client (Next.js)                           |
|                                                                       |
|   +-----------------------+     +---------------------------------+   |
|   |   Fabric.js Engine    |     |  State Engine & History Undo    |   |
|   | (Filters, Canvas, Crop)|    |   (JSON Serialization Queue)    |   |
|   +-----------+-----------+     +---------------------------------+   |
+---------------+-------------------------------------------------------+
                |
                |  HTTP / REST API (CORS Proxy Requests & Tasks)
                v
+-----------------------------------------------------------------------+
|                          Backend (FastAPI)                            |
|                                                                       |
|   +-----------------------+     +---------------------------------+   |
|   |   Image CORS Proxy    |     |    Celery Worker + Redis        |   |
|   |  (/api/v1/proxy-image)|     |  (Async AI Generation & Tasks)  |   |
|   +-----------------------+     +---------------------------------+   |
+-----------------------------------------------------------------------+
