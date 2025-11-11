# MacVis: a lightweight tool for rapid assessment of macrophage phenotypes from RNA-seq data<img width="468" height="70" alt="image" src="https://github.com/user-attachments/assets/0c908ea9-534c-426f-9f2d-97a4de2814d8" />

---

## 🚀 Instructions to Run the App by Docker

### 1️⃣ Clone the Repository
First, download the project from GitHub using the command below:

```bash
git clone https://github.com/atibagheri/MacVis.git
cd MacVis
```

---

### 2️⃣ Check the Files
You should see files like:

```bash
docker-compose.yml
backend/
degviz/
example_data/
```

---

### 3️⃣ Run the App Locally
Start all services:

```bash
docker compose up -d
```

---

### 4️⃣ Open the App in Your Browser
Once it’s running, open your web browser and go to:

👉 [http://localhost:3000/MacVis](http://localhost:3000/MacVis)

You should see the main web app interface.

---

### 5️⃣ Test with Example Data
In the folder you received (or inside the repo), you’ll find example data for each module — the filenames match the module names (e.g., PCA, Heatmap, etc.). Upload those files to test the features.

---

### 6️⃣ Stop the App
When finished, stop all containers:

```bash
docker compose down
```

---

## 🧠 Citation
If you use MacVis in your work, please cite:

**Bagheri, A. et al. (2025)** — *MacVis: A Visual Platform for Comparative Transcriptomic Analysis*.

---

## 🧩 Contact
For questions, suggestions, or collaboration inquiries, please contact:  
**Atefeh Bagheri** — PhD Candidate, App Developer  
Email: a.bagheri@vikes.csuohio.edu  

