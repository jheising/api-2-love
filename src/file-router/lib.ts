import { readdirSync, statSync } from "fs"
import path from "path"

import type { File, Route } from "./types"

import {
  calculatePriority,
  convertParamSyntax,
  isFileIgnored,
  mergePaths,
  prioritizeRoutes
} from "./utils"

/**
 * @param directory The directory path to walk recursively
 * @param tree
 *
 * @returns An array of all nested files in the specified directory
 */
export const walkTree = (directory: string, tree: string[] = []) => {
  const results: File[] = []

  for (const fileName of readdirSync(directory)) {
    const filePath = path.join(directory, fileName)
    const fileStats = statSync(filePath)

    if (fileStats.isDirectory()) {
      results.push(...walkTree(filePath, [...tree, fileName]))
    } else {
      results.push({
        name: fileName,
        path: directory,
        rel: mergePaths(...tree, fileName)
      })
    }
  }

  return results
}

/**
 * @param files
 *
 * @returns
 */
export const generateRoutes = (files: File[]) => {
  const routes: Route[] = []

  for (const file of files) {
    const parsedFile = path.parse(file.rel)

    if (isFileIgnored(parsedFile)) continue

    const directory = parsedFile.dir === parsedFile.root ? "" : parsedFile.dir
    const name = parsedFile.name.startsWith("index")
      ? parsedFile.name.replace("index", "")
      : `/${parsedFile.name}`

    const url = convertParamSyntax(directory + name)
    const priority = calculatePriority(url)

    routes.push({
      url,
      priority,
      file
    })
  }

  return prioritizeRoutes(routes)
}
