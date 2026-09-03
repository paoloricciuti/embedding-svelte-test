import fs from 'node:fs/promises';
import path from 'node:path';
import url from '#lib/EmbeddingSearch.svelte?url';

export async function GET() {
	try {
		const file = await fs.readFile(path.join(process.cwd(), 'file.txt'), 'utf-8');
		return Response.json({
			file,
			url,
			cwd: process.cwd()
		});
	} catch (e) {
		return Response.json({
			error: e instanceof Error ? e.message : String(e),
			url,
			cwd: process.cwd()
		});
	}
}
