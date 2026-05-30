import { spawn } from 'child_process'
import { join } from 'path'

const venvDir = '.venv'
export const PYTHON = process.env.PYTHON_PATH ?? join(process.cwd(), venvDir, 'bin', 'python3')

export function runPython(script: string, args: string[], timeoutMs = 180_000): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn(PYTHON, ['-W', 'ignore', script, ...args], {
      cwd: process.cwd(),
    })

    let stdout = ''
    let stderr = ''

    proc.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString() })
    proc.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString() })

    const timer = setTimeout(() => {
      proc.kill('SIGKILL')
      reject(new Error('Python process timed out'))
    }, timeoutMs)

    proc.on('close', (code: number | null, signal: NodeJS.Signals | null) => {
      clearTimeout(timer)
      if (signal) { reject(new Error(`Python process killed (${signal})`)); return }
      if (code !== 0) { reject(new Error(`Python error: ${stderr.slice(0, 2000) || 'non-zero exit'}`)); return }
      resolve(stdout)
    })

    proc.on('error', (err: Error) => {
      clearTimeout(timer)
      reject(err)
    })
  })
}
