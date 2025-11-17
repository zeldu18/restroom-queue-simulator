import EasyStar from 'easystarjs'
import type { Grid } from './types'
import { isWalkable } from './types'

export class PathFinder {
  private es = new (EasyStar as any).js()
  private gridW = 0
  private gridH = 0

  initFromGrid(grid: Grid) {
    this.gridW = grid.width
    this.gridH = grid.height
    const walk: number[][] = []
    for (let y = 0; y < grid.height; y++) {
      const row: number[] = []
      for (let x = 0; x < grid.width; x++) {
        const cell = grid.cells[y * grid.width + x]
        row.push(isWalkable(cell.type) ? 0 : 1)
      }
      walk.push(row)
    }
    this.es.setGrid(walk)
    this.es.setAcceptableTiles([0])
    this.es.enableDiagonals(false)
    this.es.disableCornerCutting()
  }

  findPath(sx: number, sy: number, tx: number, ty: number): Promise<Array<{ x: number, y: number }>> {
    return new Promise((resolve) => {
      this.es.findPath(sx, sy, tx, ty, (path: Array<{x:number,y:number}> | null) => {
        resolve(path || [])
      })
      this.es.calculate()
    })
  }
}








