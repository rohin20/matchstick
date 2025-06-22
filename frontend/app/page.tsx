"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import Script from "next/script"

interface StartupForm {
  email: string
  startupName: string
  website: string
  fundingStage: string
  industries: string[]
}

interface VC {
  id: number
  investor_name: string
  partner_name?: string
  partner_email?: string
  fund_focus_sectors?: string
  fund_stage?: string
  website?: string
  match_score: number
}

interface MatchingResponse {
  success: boolean
  sectors: string[]
  count: number
  matches: VC[]
  page: number
  per_page: number
  total_pages: number
}

const getStages = (stageString?: string): string[] => {
  if (!stageString) return []
  const stages: string[] = []
  const knownStages = ["Pre-Seed", "Seed", "Series A", "Series B", "Series C", "Series D"]

  for (const stage of knownStages) {
    if (stageString.includes(stage)) {
      stages.push(stage)
    }
  }
  return stages
}

export default function Component() {
  const [formData, setFormData] = useState<StartupForm>({
    email: "",
    startupName: "",
    website: "",
    fundingStage: "",
    industries: []
  })
  const [isLoading, setIsLoading] = useState(false)
  const [matches, setMatches] = useState<VC[]>([])
  const [totalMatches, setTotalMatches] = useState(0)
  const [showResults, setShowResults] = useState(false)
  const [error, setError] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [perPage] = useState(21)

  const availableIndustries = [
    "AI/ML",
    "FinTech", 
    "SaaS",
    "Healthcare",
    "E-Commerce",
    "Cybersecurity",
    "Big Data & Analytics",
    "Cloud",
    "Mobile",
    "Enterprise",
    "Consumer",
    "Developer Tools",
  ]

  const handleInputChange = (field: keyof StartupForm, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleIndustryChange = (industry: string) => {
    const lowercasedIndustry = industry.toLowerCase()
    setFormData(prev => {
      const industryExists = prev.industries.some(i => i.toLowerCase() === lowercasedIndustry)
      if (industryExists) {
        return {
          ...prev,
          industries: prev.industries.filter(i => i.toLowerCase() !== lowercasedIndustry)
        }
      } else {
        const originalCasingIndustry = availableIndustries.find(i => i.toLowerCase() === lowercasedIndustry)
        if (originalCasingIndustry) {
          return {
            ...prev,
            industries: [...prev.industries, originalCasingIndustry]
          }
        }
        return prev
      }
    })
  }

  const handlePageChange = async (page: number) => {
    setIsLoading(true)
    setError("")

    try {
      const matchingResponse = await fetch("http://localhost:8000/api/matching/find", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sectors: formData.industries,
          funding_stage: formData.fundingStage,
          page: page,
          per_page: perPage
        })
      })

      if (!matchingResponse.ok) {
        throw new Error("Failed to find matching investors")
      }

      const matchingData: MatchingResponse = await matchingResponse.json()
      setMatches(matchingData.matches)
      setCurrentPage(matchingData.page)
      setTotalPages(matchingData.total_pages)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      // First submit to Formspree
      const formspreeResponse = await fetch("https://formspree.io/f/xblyzlzv", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email,
          startupName: formData.startupName,
          website: formData.website,
          fundingStage: formData.fundingStage,
          industries: formData.industries.join(", "),
          message: `New startup submission: ${formData.startupName} (${formData.fundingStage} stage) in ${formData.industries.join(", ")}`
        })
      })

      if (!formspreeResponse.ok) {
        throw new Error("Failed to submit form data")
      }

      // Then submit startup information to backend
      const startupResponse = await fetch("http://localhost:8000/api/startups/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          company_name: formData.startupName,
          founder_name: formData.email,
          founder_email: formData.email,
          sector: formData.industries.join(", "),
          funding_stage: formData.fundingStage
        })
      })

      if (!startupResponse.ok) {
        throw new Error("Failed to submit startup information")
      }

      // Then find matching VCs
      const matchingResponse = await fetch("http://localhost:8000/api/matching/find", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sectors: formData.industries,
          funding_stage: formData.fundingStage,
          page: 1,
          per_page: perPage
        })
      })

      if (!matchingResponse.ok) {
        throw new Error("Failed to find matching investors")
      }

      const matchingData: MatchingResponse = await matchingResponse.json()
      setMatches(matchingData.matches)
      setTotalMatches(matchingData.count)
      setCurrentPage(matchingData.page)
      setTotalPages(matchingData.total_pages)
      setShowResults(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  if (showResults) {
    return (
      <div className="min-h-screen bg-black">
        <Script
          id="structured-data"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              "name": "Matchstick",
              "description": "Connect startups with the right investors in under 1 minute. Access a diverse network of over 3,000 investors with verified email addresses.",
              "url": "https://matchstickvc.com",
              "applicationCategory": "BusinessApplication",
              "operatingSystem": "Web Browser",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD",
                "description": "Free startup-investor matching service"
              },
              "provider": {
                "@type": "Organization",
                "name": "Matchstick",
                "url": "https://matchstickvc.com"
              },
              "featureList": [
                "Investor matching algorithm",
                "3,000+ investor database",
                "Verified email addresses",
                "Industry-based matching",
                "Funding stage filtering",
                "Free service"
              ],
              "screenshot": "https://matchstickvc.com/screenshot.png",
              "softwareVersion": "1.0.0"
            })
          }}
        />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8 flex justify-between items-center">
              <Button 
                onClick={() => {
                  setShowResults(false)
                  setCurrentPage(1)
                  setTotalPages(1)
                }}
                className="bg-black text-white border-white hover:bg-gray-800"
              >
                ← Back to form
              </Button>
            </div>
            
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold text-white mb-2">Your Investor Matches</h1>
              <p className="text-gray-400">
                Showing {matches.length} of {totalMatches} investors matching your startup (Page {currentPage} of {totalPages})
              </p>
            </div>

            {isLoading && (
              <div className="text-center py-8">
                <p className="text-gray-400">Loading investors...</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {matches.map((vc) => {
                const industries = vc.fund_focus_sectors
                  ? availableIndustries.filter(i => vc.fund_focus_sectors!.toLowerCase().includes(i.toLowerCase()))
                  : []
                const fundingStages = getStages(vc.fund_stage)

                return (
                  <div key={vc.id} className="bg-black rounded-lg p-6 border border-gray-800 flex flex-col space-y-4">
                    <div className="flex-grow">
                      <h3 className="text-xl font-bold text-white">{vc.partner_name || vc.investor_name}</h3>
                      {vc.partner_email && (
                        <p className="text-sm text-gray-400 mt-1">{vc.partner_email}</p>
                      )}
                      <p className="text-lg text-white mt-2 font-medium">{vc.investor_name}</p>
                    </div>

                    {fundingStages.length > 0 && (
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Funding Stages</p>
                        <div className="flex flex-wrap gap-2">
                          {fundingStages.map((stage) => (
                            <span key={stage} className="bg-gray-800 text-gray-300 text-xs font-medium px-2.5 py-1 rounded">
                              {stage}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {industries.length > 0 && (
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Target Industries</p>
                        <div className="flex flex-wrap gap-2">
                          {industries.map((industry) => (
                            <span key={industry} className="bg-gray-800 text-gray-300 text-xs font-medium px-2.5 py-1 rounded">
                              {industry}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-12 flex justify-center items-center space-x-4">
                <Button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1 || isLoading}
                  className="bg-black text-white border-white hover:bg-gray-800 disabled:opacity-50"
                >
                  Previous
                </Button>
                
                <div className="flex items-center space-x-2">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <Button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        disabled={isLoading}
                        className={`w-10 h-10 ${
                          currentPage === pageNum
                            ? "bg-white text-black"
                            : "bg-black text-white border-white hover:bg-gray-800"
                        }`}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                
                <Button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages || isLoading}
                  className="bg-black text-white border-white hover:bg-gray-800 disabled:opacity-50"
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      <Script
        id="structured-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            "name": "Matchstick",
            "description": "Connect startups with the right investors in under 1 minute. Access a diverse network of over 3,000 investors with verified email addresses.",
            "url": "https://matchstickvc.com",
            "applicationCategory": "BusinessApplication",
            "operatingSystem": "Web Browser",
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "USD",
              "description": "Free startup-investor matching service"
            },
            "provider": {
              "@type": "Organization",
              "name": "Matchstick",
              "url": "https://matchstickvc.com"
            },
            "featureList": [
              "Investor matching algorithm",
              "3,000+ investor database",
              "Verified email addresses",
              "Industry-based matching",
              "Funding stage filtering",
              "Free service"
            ],
            "screenshot": "https://matchstickvc.com/screenshot.png",
            "softwareVersion": "1.0.0"
          })
        }}
      />
      <div className="container mx-auto px-4 py-8 lg:py-12">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center max-w-6xl mx-auto">
          {/* Left side - Product statement */}
          <div className="space-y-6">
            <div className="space-y-4">
              <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-white">matchstick</h1>
              <h2 className="text-2xl lg:text-3xl font-medium text-gray-300">
                Connecting your startup with the right investors in &lt; 1 minute.
              </h2>
              <p className="text-lg text-gray-400 leading-relaxed">
                Access a diverse network of over <span className="text-red-400">3,000 investors</span>, including verified <span className="text-red-400">email addresses</span>.
              </p>
            </div>
          </div>

          {/* Right side - Form */}
          <div className="p-8">
            <div className="space-y-6">
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-white">Get matched with the best investors for free.</h3>
              </div>

              {error && (
                <div className="bg-red-900/20 border border-red-800 rounded-lg p-4">
                  <p className="text-red-400">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-white">
                    Email*
                  </Label>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="john@gmail.com"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="startupName" className="text-white">
                    Startup name*
                  </Label>
                  <Input 
                    id="startupName" 
                    placeholder="Your startup name"
                    value={formData.startupName}
                    onChange={(e) => handleInputChange("startupName", e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website" className="text-white">
                    Website
                  </Label>
                  <Input 
                    id="website" 
                    placeholder="https://www.yourstartup.com"
                    value={formData.website}
                    onChange={(e) => handleInputChange("website", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stage" className="text-white">
                    Funding stage
                  </Label>
                  <Select onValueChange={(value) => handleInputChange("fundingStage", value)}>
                    <SelectTrigger className="text-white">
                      <SelectValue placeholder="Select funding stage" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pre-seed">Pre-seed</SelectItem>
                      <SelectItem value="seed">Seed</SelectItem>
                      <SelectItem value="series-a">Series A</SelectItem>
                      <SelectItem value="series-b">Series B</SelectItem>
                      <SelectItem value="series-c">Series C+</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-white">
                    Industries (select all that apply)*
                  </Label>
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                    {availableIndustries.map((industry) => (
                      <label key={industry} className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.industries.some(i => i.toLowerCase() === industry.toLowerCase())}
                          onChange={() => handleIndustryChange(industry)}
                          className="rounded border-gray-600 bg-gray-800 text-white focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-300">{industry}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-white hover:bg-gray-100 text-black"
                  disabled={isLoading || formData.industries.length === 0}
                >
                  {isLoading ? "Finding investors..." : "Find my investors"}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
