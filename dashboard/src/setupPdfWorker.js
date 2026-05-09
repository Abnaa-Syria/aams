import { pdfjs } from 'react-pdf';
// Bundled worker — must match react-pdf’s pdfjs-dist (package.json overrides).
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
