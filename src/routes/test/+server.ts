import fs from 'node:fs/promises';
import path from 'node:path';

export async function GET() {
	try {
		const file = await fs.readFile(path.join(process.cwd(), 'file.txt'), 'utf-8');
		return Response.json({
			file,
			cwd: process.cwd()
		});
	} catch {
		return Response.json({
			error: 'File not found',
			cwd: process.cwd()
		});
	}
}
