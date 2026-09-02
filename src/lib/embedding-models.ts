export type EmbeddingModel = {
	name: string;
	dtype: 'fp32' | 'q8';
	pooling: 'mean' | 'cls';
	query_prefix: string;
	document_prefix: string;
	/** approximate download size in MB (model weights + tokenizer + config) */
	download_size_mb: number;
};

export const embedding_models: EmbeddingModel[] = [
	{
		name: 'onnx-community/embeddinggemma-300m-ONNX',
		dtype: 'q8',
		pooling: 'mean',
		query_prefix: 'task: search result | query: ',
		document_prefix: 'title: none | text: ',
		download_size_mb: 331
	},
	{
		name: 'onnx-community/all-MiniLM-L6-v2-ONNX',
		dtype: 'fp32',
		pooling: 'mean',
		query_prefix: '',
		document_prefix: '',
		download_size_mb: 91
	},
	{
		name: 'Nicolassuez/bekko-embedding-v1-a25m-onnx-q8',
		dtype: 'q8',
		pooling: 'mean',
		query_prefix: '',
		document_prefix: '',
		download_size_mb: 158
	},
	{
		name: 'onnx-community/granite-embedding-small-english-r2-ONNX',
		dtype: 'q8',
		pooling: 'cls',
		query_prefix: '',
		document_prefix: '',
		download_size_mb: 55
	}
];
