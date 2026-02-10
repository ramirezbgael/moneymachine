/**
 * Local Printer Detection Service
 * Runs on http://localhost:3001
 * 
 * Usage:
 *   npm install
 *   npm start
 * 
 * Then the POS app can detect printers via:
 *   fetch('http://localhost:3001/api/printers')
 */

const express = require('express')
const cors = require('cors')
const { exec } = require('child_process')
const { promisify } = require('util')

const execAsync = promisify(exec)
const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json())

/**
 * Detect printers based on OS
 */
async function detectPrinters() {
  const printers = []
  
  try {
    if (process.platform === 'win32') {
      // Windows: Use PowerShell
      const { stdout } = await execAsync(
        'powershell -Command "Get-Printer | Select-Object Name, PrinterStatus | ConvertTo-Json"'
      )
      
      try {
        const data = JSON.parse(stdout)
        const printerArray = Array.isArray(data) ? data : [data]
        printerArray.forEach(p => {
          if (p && p.Name) {
            printers.push({
              name: p.Name,
              status: p.PrinterStatus || 'available'
            })
          }
        })
      } catch (parseError) {
        // Fallback: parse line by line
        const lines = stdout.split('\n')
        for (const line of lines) {
          const match = line.match(/"Name"\s*:\s*"([^"]+)"/)
          if (match) {
            printers.push({
              name: match[1],
              status: 'available'
            })
          }
        }
      }
    } else if (process.platform === 'darwin') {
      // macOS: Use lpstat
      const { stdout } = await execAsync('lpstat -p')
      const lines = stdout.split('\n')
      
      for (const line of lines) {
        if (line.startsWith('printer ')) {
          const parts = line.split(/\s+/)
          if (parts.length > 1) {
            printers.push({
              name: parts[1],
              status: 'available'
            })
          }
        }
      }
    } else {
      // Linux: Use lpstat (CUPS)
      const { stdout } = await execAsync('lpstat -p 2>/dev/null || echo ""')
      const lines = stdout.split('\n')
      
      for (const line of lines) {
        if (line.startsWith('printer ')) {
          const parts = line.split(/\s+/)
          if (parts.length > 1) {
            printers.push({
              name: parts[1],
              status: 'available'
            })
          }
        }
      }
    }
  } catch (error) {
    console.error('Error detecting printers:', error.message)
  }
  
  return printers
}

/**
 * GET /api/printers
 * Returns list of available printers
 */
app.get('/api/printers', async (req, res) => {
  try {
    const printers = await detectPrinters()
    res.json({ 
      success: true,
      printers,
      count: printers.length
    })
  } catch (error) {
    console.error('Error in /api/printers:', error)
    res.status(500).json({ 
      success: false,
      error: error.message,
      printers: []
    })
  }
})

/**
 * GET /api/health
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok',
    service: 'POS Printer Service',
    platform: process.platform,
    timestamp: new Date().toISOString()
  })
})

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 POS Printer Service running on http://localhost:${PORT}`)
  console.log(`📋 Platform: ${process.platform}`)
  console.log(`🔍 Endpoint: http://localhost:${PORT}/api/printers\n`)
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down printer service...')
  process.exit(0)
})
