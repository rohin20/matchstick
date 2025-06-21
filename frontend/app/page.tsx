"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

interface StartupForm {
  firstName: string
  lastName: string
  email: string
  startupName: string
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
    firstName: "",
    lastName: "",
    email: "",
    startupName: "",
    fundingStage: "",
    industries: []
  })
  const [isLoading, setIsLoading] = useState(false)
  const [matches, setMatches] = useState<VC[]>([])
  const [totalMatches, setTotalMatches] = useState(0)
  const [showResults, setShowResults] = useState(false)
  const [error, setError] = useState("")

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      // First submit startup information
      const startupResponse = await fetch("http://localhost:8000/api/startups/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          company_name: formData.startupName,
          founder_name: `${formData.firstName} ${formData.lastName}`,
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
          funding_stage: formData.fundingStage
        })
      })

      if (!matchingResponse.ok) {
        throw new Error("Failed to find matching investors")
      }

      const matchingData: MatchingResponse = await matchingResponse.json()
      setMatches(matchingData.matches)
      setTotalMatches(matchingData.count)
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
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8 flex justify-between items-center">
              <Button 
                onClick={() => setShowResults(false)}
                className="bg-black text-white border-white hover:bg-gray-800"
              >
                ← Back to form
              </Button>
            </div>
            
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold text-white mb-2">Your Investor Matches</h1>
              <p className="text-gray-400">
                Showing {matches.length}/{totalMatches} investors matching your Startup.
              </p>
            </div>

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
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto px-4 py-8 lg:py-12">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center max-w-6xl mx-auto">
          {/* Left side - Product statement */}
          <div className="space-y-6">
            <div className="space-y-4">
              <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-white">matchstick</h1>
              <h2 className="text-2xl lg:text-3xl font-medium text-gray-300">
                Connect startups with the right investors
              </h2>
              <p className="text-lg text-gray-400 leading-relaxed">
                Skip the endless networking events and cold emails. We match ambitious startups with investors who are
                actively looking for opportunities in your space.
              </p>
            </div>
            <div className="space-y-3 text-gray-400">
              <div className="flex items-center space-x-2">
                <div className="w-1.5 h-1.5 bg-gray-600 rounded-full"></div>
                <span>Curated investor network</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-1.5 h-1.5 bg-gray-600 rounded-full"></div>
                <span>Smart matching algorithm</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-1.5 h-1.5 bg-gray-600 rounded-full"></div>
                <span>Direct introductions</span>
              </div>
            </div>
          </div>

          {/* Right side - Form */}
          <div className="p-8">
            <div className="space-y-6">
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-white">Get matched with investors</h3>
                <p className="text-gray-400">
                  Tell us about your startup and we'll connect you with relevant investors.
                </p>
              </div>

              {error && (
                <div className="bg-red-900/20 border border-red-800 rounded-lg p-4">
                  <p className="text-red-400">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="text-white">
                      First name
                    </Label>
                    <Input 
                      id="firstName" 
                      placeholder="John"
                      value={formData.firstName}
                      onChange={(e) => handleInputChange("firstName", e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="text-white">
                      Last name
                    </Label>
                    <Input 
                      id="lastName" 
                      placeholder="Doe"
                      value={formData.lastName}
                      onChange={(e) => handleInputChange("lastName", e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-white">
                    Email
                  </Label>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="john@startup.com"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="startupName" className="text-white">
                    Startup name
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
                    Industries (select all that apply)
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
