import express from "express";
import type { Request, Response } from "express";

import { db } from "../../db/index.js";
import { tags } from "../../db/schema.js";
import type { tagEntry } from "../../core/types.js";

export const tagsRouter = express.Router();

tagsRouter.get("/tags", async (_req: Request, res: Response) => {
  try {
    const tagsData: tagEntry[] = await db
      .select({
        id: tags.id,
        name: tags.name,
      })
      .from(tags);

    res.status(200).json(tagsData);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to get tags." });
  }
});
