from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from typing import List, Optional
import pandas as pd
import sqlite3
import os
from pathlib import Path

# Initialize FastAPI app
app = FastAPI(
    title="VC Matching API",
    description="API for matching startups with venture capitalists",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models for request/response
class StartupSubmission(BaseModel):
    company_name: str
    founder_name: str
    founder_email: str
    sector: str
    description: Optional[str] = None
    funding_stage: Optional[str] = None

class MatchingRequest(BaseModel):
    sectors: List[str]
    funding_stage: Optional[str] = None

class VC(BaseModel):
    id: int
    investor_name: str
    partner_name: Optional[str]
    partner_email: Optional[str]
    fund_focus_sectors: Optional[str]
    fund_stage: Optional[str]
    website: Optional[str]
    match_score: float

class MatchingResponse(BaseModel):
    success: bool
    sectors: List[str]  # Changed from sector to sectors
    count: int
    matches: List[VC]

# Database setup
DATABASE_PATH = "backend/database/vc_matching.db"
CSV_PATH = "data.csv"

def init_database():
    """Initialize SQLite database and import CSV data"""
    os.makedirs("backend/database", exist_ok=True)
    
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    
    # Create tables
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS vcs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            investor_name TEXT NOT NULL,
            partner_name TEXT,
            partner_email TEXT,
            fund_focus_sectors TEXT,
            fund_stage TEXT,
            website TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS startups (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            company_name TEXT NOT NULL,
            founder_name TEXT NOT NULL,
            founder_email TEXT NOT NULL,
            sector TEXT NOT NULL,
            description TEXT,
            funding_stage TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS matches (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            startup_id INTEGER,
            vc_id INTEGER,
            match_score FLOAT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (startup_id) REFERENCES startups (id),
            FOREIGN KEY (vc_id) REFERENCES vcs (id)
        )
    ''')
    
    # Check if VCs table is empty, if so import CSV data
    cursor.execute("SELECT COUNT(*) FROM vcs")
    if cursor.fetchone()[0] == 0:
        print("Importing CSV data...")
        import_csv_data(cursor)
    
    conn.commit()
    conn.close()
    print("Database initialized successfully")

def import_csv_data(cursor):
    """Import CSV data into the database"""
    try:
        df = pd.read_csv(CSV_PATH)
        
        # Clean the data - remove rows with empty investor names
        df = df.dropna(subset=['Investor Name'])
        df = df[df['Investor Name'].str.strip() != '']
        
        for _, row in df.iterrows():
            cursor.execute('''
                INSERT INTO vcs (investor_name, partner_name, partner_email, fund_focus_sectors, fund_stage, website)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                row['Investor Name'].strip(),
                row['Partner Name'] if pd.notna(row['Partner Name']) else None,
                row['Partner Email'] if pd.notna(row['Partner Email']) else None,
                row['Fund Focus (Sectors)'] if pd.notna(row['Fund Focus (Sectors)']) else None,
                row['Fund Stage'] if pd.notna(row['Fund Stage']) else None,
                row['Website (if available)'] if pd.notna(row['Website (if available)']) else None
            ))
        
        print(f"Imported {len(df)} VCs from CSV")
    except Exception as e:
        print(f"Error importing CSV: {e}")

def get_db_connection():
    """Get database connection"""
    return sqlite3.connect(DATABASE_PATH)

# Initialize database on startup
@app.on_event("startup")
async def startup_event():
    init_database()

# Health check endpoint
@app.get("/api/health")
async def health_check():
    return {"status": "OK", "message": "VC Matching API is running"}

# Get available sectors
@app.get("/api/matching/sectors")
async def get_sectors():
    target_sectors = [
        'AI/ML',
        'FinTech', 
        'SaaS',
        'Healthcare',
        'E-Commerce',
        'Cybersecurity',
        'Big Data & Analytics',
        'Cloud',
        'Mobile',
        'Enterprise',
        'Consumer',
        'Developer Tools',
    ]
    
    return {
        "success": True,
        "sectors": target_sectors
    }

# Find matching VCs
@app.post("/api/matching/find", response_model=MatchingResponse)
async def find_matching_vcs(request: MatchingRequest):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Map SaaS to Software for querying
    mapped_sectors = ["Software" if s.lower() == 'saas' else s for s in request.sectors]

    stage_map = {
        "pre-seed": "Pre-Seed",
        "seed": "Seed",
        "series-a": "Series A",
        "series-b": "Series B",
        "series-c": "Series C",
    }
    
    conditions = []
    params = []

    # Sector conditions
    if mapped_sectors:
        sector_conditions = ' OR '.join([f"fund_focus_sectors LIKE ?" for s in mapped_sectors])
        conditions.append(f"({sector_conditions})")
        # Ensure searching for whole words or delimited terms
        params.extend([f'%{s}%' for s in mapped_sectors])

    # Funding stage condition
    if request.funding_stage and request.funding_stage in stage_map:
        db_funding_stage = stage_map[request.funding_stage]
        conditions.append("fund_stage LIKE ?")
        params.append(f'%{db_funding_stage}%')

    where_clause = " AND ".join(conditions) if conditions else "1=1"
    
    query = f'''
        SELECT 
            id,
            investor_name,
            partner_name,
            partner_email,
            fund_focus_sectors,
            fund_stage,
            website
        FROM vcs 
        WHERE {where_clause}
        ORDER BY investor_name
    '''
    
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    
    # Calculate match scores for multiple sectors
    matches = []
    for row in rows:
        vc_id, investor_name, partner_name, partner_email, fund_focus_sectors, fund_stage, website = row
        
        # Calculate match score based on how many sectors match
        if fund_focus_sectors:
            # Split by spaces and clean up the sectors
            vc_sectors = [s.strip() for s in fund_focus_sectors.split() if s.strip()]
            
            # Count how many of the requested sectors match any of the VC's sectors
            matching_sectors = []
            for requested_sector in mapped_sectors:
                for vc_sector in vc_sectors:
                    # Check if the requested sector is contained in the VC sector or vice versa
                    if (requested_sector.lower() in vc_sector.lower() or 
                        vc_sector.lower() in requested_sector.lower()):
                        matching_sectors.append(requested_sector)
                        break  # Found a match for this requested sector, move to next
            
            # Calculate score: number of matching sectors / number of requested sectors
            # But give a minimum score of 0.5 for any match
            if matching_sectors:
                base_score = len(matching_sectors) / len(mapped_sectors)
                # Boost the score so that any match gets at least 0.5
                match_score = max(0.5, base_score)
            else:
                match_score = 0.0
        else:
            match_score = 0.0
        
        vc = VC(
            id=vc_id,
            investor_name=investor_name,
            partner_name=partner_name,
            partner_email=partner_email,
            fund_focus_sectors=fund_focus_sectors,
            fund_stage=fund_stage,
            website=website,
            match_score=match_score
        )
        matches.append(vc)
    
    # Sort by match score (highest first)
    matches.sort(key=lambda x: x.match_score, reverse=True)
    
    return MatchingResponse(
        success=True,
        sectors=mapped_sectors,
        count=len(matches),
        matches=matches[:20]
    )

# Submit startup information
@app.post("/api/startups/submit")
async def submit_startup(startup: StartupSubmission):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            INSERT INTO startups (company_name, founder_name, founder_email, sector, description, funding_stage)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (
            startup.company_name,
            startup.founder_name,
            startup.founder_email,
            startup.sector,
            startup.description,
            startup.funding_stage
        ))
        
        startup_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return {
            "success": True,
            "message": "Startup information saved successfully",
            "startup_id": startup_id
        }
    except Exception as e:
        conn.rollback()
        conn.close()
        raise HTTPException(status_code=500, detail=f"Failed to save startup: {str(e)}")

# Get startup by ID
@app.get("/api/startups/{startup_id}")
async def get_startup(startup_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM startups WHERE id = ?", (startup_id,))
    row = cursor.fetchone()
    conn.close()
    
    if not row:
        raise HTTPException(status_code=404, detail="Startup not found")
    
    return {
        "success": True,
        "startup": {
            "id": row[0],
            "company_name": row[1],
            "founder_name": row[2],
            "founder_email": row[3],
            "sector": row[4],
            "description": row[5],
            "funding_stage": row[6],
            "created_at": row[7]
        }
    }

# Get API statistics
@app.get("/api/stats")
async def get_stats():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Get total VCs
    cursor.execute("SELECT COUNT(*) FROM vcs")
    total_vcs = cursor.fetchone()[0]
    
    # Get total startups
    cursor.execute("SELECT COUNT(*) FROM startups")
    total_startups = cursor.fetchone()[0]
    
    # Get sector distribution
    cursor.execute('''
        SELECT fund_focus_sectors, COUNT(*) as count
        FROM vcs 
        WHERE fund_focus_sectors IS NOT NULL AND fund_focus_sectors != ''
        GROUP BY fund_focus_sectors
        ORDER BY count DESC
        LIMIT 10
    ''')
    sector_stats = cursor.fetchall()
    
    conn.close()
    
    return {
        "success": True,
        "stats": {
            "total_vcs": total_vcs,
            "total_startups": total_startups,
            "top_sectors": [{"sector": sector, "count": count} for sector, count in sector_stats]
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 