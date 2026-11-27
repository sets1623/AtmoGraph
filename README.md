
# 🌐 AtmoGraph
### AI-Powered Global Supply Chain Ripple Effect Predictor

**AtmoGraph** is a web-based supply chain intelligence platform designed to explore global supplier networks, identify structural vulnerabilities, and simulate how disruptions can propagate across connected companies.

🌍 **Live Demo:** https://atmo-graph.vercel.app  
📦 **GitHub Repository:** https://github.com/sets1623/AtmoGraph

---

## 🚀 Project Overview

Modern supply chains are interconnected networks. A disruption affecting one supplier, manufacturer, or logistics hub can create cascading effects across multiple companies and industries.

AtmoGraph provides an interactive environment to explore these relationships, analyze structural risk, and model potential disruption scenarios.

## ✨ Key Features

- **Interactive Supply Chain Network:** Explore companies and their supplier-customer relationships.
- **Structural Risk Analysis:** Evaluate vulnerability using network-based indicators.
- **Dependency Explorer:** Investigate upstream suppliers and downstream customers.
- **Impact Analysis:** Examine multi-level disruption propagation.
- **Disruption Simulator:** Simulate disruption scenarios with adjustable severity.
- **Simulation History:** Save and review previous simulation results locally.
- **Multiple Datasets:** Explore a synthetic demonstration network and the Sectivia supply chain dataset.

## 🛠️ Technology Stack

| Category | Technologies |
|---|---|
| Frontend | Next.js, React, TypeScript |
| Styling | Tailwind CSS |
| Network Visualization | React Flow |
| Data Processing | TypeScript |
| Data Storage | Browser Local Storage |
| Deployment | Vercel |
| Version Control | Git, GitHub |

## 🧠 How It Works

1. Load a supply chain dataset.
2. Construct a directed supplier-customer graph.
3. Calculate structural vulnerability indicators.
4. Select a company or supply chain entity.
5. Configure disruption severity and analysis depth.
6. Explore affected companies and network relationships.
7. Review and save simulation results.

## 📊 Dataset

AtmoGraph uses the Sectivia supply chain dataset.

**Source:** https://sectivia.com/dataset/

The dataset contains company information and documented supply-chain relationships.

- 382 companies
- 583 relationships
- 8 sectors
- 61 segments

**Dataset attribution:** Sectivia

**License:** Creative Commons Attribution 4.0 International (CC BY 4.0).

## ⚙️ Installation and Setup

### Prerequisites
- Node.js
- npm
- Git

### Clone the repository

```bash
git clone https://github.com/sets1623/AtmoGraph.git
cd AtmoGraph/frontend
```

### Install dependencies

```bash
npm install
```

### Start the development server

```bash
npm run dev
```

Open http://localhost:3000 in your browser.

### Production build

```bash
npm run build
npm run start
```

## ⚠️ Methodology and Limitations

AtmoGraph currently uses network-based structural indicators and rule-based scenario propagation.

- Risk scores are heuristic estimates, not trained machine-learning predictions.
- Disruption scores do not represent actual disruption probabilities.
- The dataset does not provide complete supplier relationships or purchase-volume information.
- Simulation results depend on the available network relationships and selected scenario parameters.

## 🔮 Future Improvements

- Real-time supply chain data integration.
- More comprehensive supplier relationship datasets.
- Advanced predictive machine-learning models.
- Geographical supply chain visualization.
- Improved disruption scenario modeling.
- Exportable analytical reports.

## 👨‍💻 Developer

**Tamil Selvan SE**  
Final-Year B.E. Electrical and Electronics Engineering Student

Interested in engineering applications, data analytics, intelligent systems, and technology-driven solutions.

---

⭐ If you find this project interesting, consider starring the repository!

**AtmoGraph — Explore Connections. Understand Risk. Predict Ripple Effects.**

<!-- Project maintenance: November 27, 2026 -->
