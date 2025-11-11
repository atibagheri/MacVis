# MacVis: a lightweight tool for rapid assessment of macrophage phenotypes from RNA-seq data
---

## Instructions to Run the App by Docker

✅ Prerequisites

Before running MacVis, make sure the following are installed:

Docker and Docker Compose

Install Docker: [https://docs.docker.com/get-docker/](https://www.docker.com/get-started/)

---
### 1️⃣ Clone the Repository
First, download the project from GitHub using the command below:

```bash
git clone https://github.com/atibagheri/MacVis.git
```

---

### 2️⃣ Check the Files
Go to directory
```bash
cd MacVis
ls
```

You should see the following files:
docker-compose.yml
backend/
degviz/
example_data/

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
In the MacVis folder you’ll find example data for each module — the filenames match the module names (e.g., PCA, Heatmap, etc.). Upload those files to test the features.

---

### 6️⃣ Stop the App
When finished, stop all containers:

```bash
docker compose down
```

---

## Citation
If you use MacVis in your work, please cite:

Bagheri, A., Prabahar, A., & Jiang, P. (2025). MacVis: A Visual Platform for Comparative Transcriptomic Analysis.

---

## Contact

**Atefeh Bagheri**  
PhD Candidate, App Developer  

Department of Biological, Geological and Environmental Sciences (BGES)  
Center for Gene Regulation in Health and Disease (GRHD)  
Cleveland State University  
2121 Euclid Ave, Cleveland, OH 44115  

📧 Email: [a.bagheri@vikes.csuohio.edu](mailto:a.bagheri@vikes.csuohio.edu)  
🌐 Website: [https://atibagheri.github.io/Website/](https://atibagheri.github.io/Website/)  


