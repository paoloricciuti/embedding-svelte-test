export type EmbeddingModel = {
	name: string;
	dtype: 'fp32' | 'q8';
	pooling: 'mean' | 'cls';
	query_prefix: string;
	document_prefix: string;
};

export const embedding_models: EmbeddingModel[] = [
	{
		name: 'onnx-community/embeddinggemma-300m-ONNX',
		dtype: 'q8',
		pooling: 'mean',
		query_prefix: 'task: search result | query: ',
		document_prefix: 'title: none | text: '
	},
	{
		name: 'onnx-community/all-MiniLM-L6-v2-ONNX',
		dtype: 'fp32',
		pooling: 'mean',
		query_prefix: '',
		document_prefix: ''
	},
	{
		name: 'Nicolassuez/bekko-embedding-v1-a25m-onnx-q8',
		dtype: 'q8',
		pooling: 'mean',
		query_prefix: '',
		document_prefix: ''
	},
	{
		name: 'onnx-community/granite-embedding-small-english-r2-ONNX',
		dtype: 'q8',
		pooling: 'cls',
		query_prefix: '',
		document_prefix: ''
	}
];
