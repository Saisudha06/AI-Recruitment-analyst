'use strict';

// ── PDF.js Worker Setup ───────────────────────────────────
if (typeof pdfjsLib !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

// ── Global State ──────────────────────────────────────────
const state = {
    files: [], jobTitle: '', jobDescription: '',
    candidates: [], filteredCandidates: [], selectedIds: new Set(),
    sortMode: 'score-desc',
    filters: { minScore: 0, expMin: 0, expMax: 30, skills: [], certifications: [], languages: [], companies: [], availability: '', linkedin: '', qualifications: [], degrees: [], keywords: '' },
    jdAnalysis: { requiredSkills: [], preferredSkills: [], minExperience: 0, certifications: [] },
    allSkills: new Set(), allCerts: new Set(), allLanguages: new Set(), allCompanies: new Set(),
    processingPromise: null
};

const $ = id => document.getElementById(id);
const showScreen = id => { document.querySelectorAll('.screen').forEach(s => s.classList.remove('active')); $(id).classList.add('active'); };

// ── Skills / Cert Keyword Lists ───────────────────────────
const ALL_SKILLS = [
    'React', 'Vue.js', 'Angular', 'Next.js', 'Nuxt.js', 'Svelte', 'JavaScript', 'TypeScript', 'HTML', 'CSS', 'SASS', 'Tailwind',
    'Node.js', 'Express', 'Fastify', 'NestJS', 'Python', 'Django', 'Flask', 'FastAPI', 'Java', 'Spring Boot', 'Kotlin',
    'Go', 'Rust', 'C++', 'C#', '.NET', 'PHP', 'Laravel', 'Ruby', 'Rails', 'Swift', 'Objective-C',
    'AWS', 'Azure', 'GCP', 'Google Cloud', 'Firebase', 'Supabase', 'Vercel', 'Netlify', 'Heroku',
    'Docker', 'Kubernetes', 'Terraform', 'Ansible', 'Jenkins', 'GitHub Actions', 'CircleCI', 'CI/CD',
    'Machine Learning', 'Deep Learning', 'TensorFlow', 'PyTorch', 'Keras', 'Scikit-learn', 'Pandas', 'NumPy', 'OpenCV',
    'SQL', 'PostgreSQL', 'MySQL', 'SQLite', 'MongoDB', 'Redis', 'Cassandra', 'DynamoDB', 'Elasticsearch', 'Kafka', 'RabbitMQ',
    'GraphQL', 'REST', 'APIs', 'Microservices', 'gRPC', 'WebSockets',
    'Apache Spark', 'Hadoop', 'Airflow', 'dbt', 'Snowflake', 'BigQuery', 'Databricks', 'Power BI', 'Tableau',
    'Git', 'Linux', 'Bash', 'Agile', 'Scrum', 'Jira', 'Figma', 'Photoshop', 'Sketch',
    'Penetration Testing', 'OWASP', 'SIEM', 'Network Security', 'Cryptography', 'CISSP', 'CEH',
    'Solidity', 'Web3.js', 'Ethereum', 'Smart Contracts', 'Blockchain',
    'React Native', 'Flutter', 'Android', 'iOS', 'Xcode',
    'Unity', 'Unreal Engine', 'OpenGL', 'WebGL', 'Three.js', 'D3.js', 'Redux', 'MobX', 'Zustand',
    'Product Management', 'Stakeholder Management', 'Roadmapping', 'A/B Testing', 'SEO', 'SEM'
];

// Comprehensive programming languages always shown in the skills filter
const PROGRAMMING_LANGUAGES = [
    // Web / Frontend
    'JavaScript', 'TypeScript', 'HTML', 'CSS', 'SASS', 'SCSS', 'Tailwind', 'WebAssembly',
    // Backend
    'Python', 'Java', 'Kotlin', 'Go', 'Rust', 'C', 'C++', 'C#', 'Ruby', 'PHP', 'Swift', 'R', 'Scala', 'Elixir', 'Erlang', 'Haskell', 'Clojure', 'F#', 'OCaml', 'Nim', 'Zig', 'V',
    // Scripting / Systems
    'Bash', 'Shell', 'PowerShell', 'Perl', 'Lua', 'Groovy', 'Tcl',
    // Data / ML
    'Julia', 'MATLAB', 'SAS', 'Fortran', 'COBOL',
    // Database query
    'SQL', 'PL/SQL', 'T-SQL', 'PostgreSQL', 'MySQL', 'SQLite', 'MongoDB', 'Redis', 'Cassandra', 'DynamoDB',
    // Mobile
    'Dart', 'Flutter', 'React Native', 'Swift', 'Kotlin', 'Objective-C',
    // Functional / Academic
    'Lisp', 'Prolog', 'Scheme', 'Racket', 'Smalltalk', 'Ada', 'VHDL', 'Verilog',
    // Markup / Config
    'GraphQL', 'XML', 'YAML', 'JSON', 'Terraform HCL', 'Bicep', 'Solidity', 'Move', 'Vyper',
    // Frameworks (most popular)
    'React', 'Vue.js', 'Angular', 'Next.js', 'Nuxt.js', 'Svelte', 'Astro', 'Remix',
    'Node.js', 'Deno', 'Bun', 'Express', 'FastAPI', 'Django', 'Flask', 'Spring Boot', 'Laravel', 'Rails', 'ASP.NET',
    // Other popular tools counted as skills
    'Assembly', 'CUDA', 'OpenCL', 'GLSL', 'HLSL'
];

const ALL_CERTS = [
    'AWS Solutions Architect', 'AWS Developer', 'AWS DevOps', 'AWS Machine Learning', 'AWS SysOps',
    'Google Cloud Professional', 'Google Cloud Associate', 'Google UX Design', 'Google Data Analytics',
    'Azure Solutions Architect', 'Azure Administrator', 'Azure Developer',
    'Certified Kubernetes Administrator', 'CKA', 'CKAD', 'CKS',
    'CISSP', 'CEH', 'CompTIA Security+', 'CompTIA Network+', 'CompTIA A+',
    'PMP', 'Certified Scrum Master', 'SAFe Agilist', 'PRINCE2',
    'Oracle Java Professional', 'Oracle Database', 'Spring Professional',
    'TensorFlow Developer', 'IBM Data Science', 'IBM AI Engineering',
    'Meta Frontend Developer', 'Meta Backend Developer', 'Meta Marketing',
    'Terraform Associate', 'HashiCorp Vault', 'HashiCorp Consul',
    'MongoDB Developer', 'Redis Certified Developer', 'Databricks Certified',
    'Salesforce Administrator', 'Salesforce Developer', 'Salesforce Architect',
    'dbt Certified', 'Snowflake SnowPro',
    'Certified Data Scientist', 'SAS Certified', 'Tableau Desktop Specialist',
    'Apple Developer', 'Google Associate Android Developer', 'Flutter Certified',
    'ITIL Foundation', 'PMI-ACP', 'PMI-PBA', 'Six Sigma', 'Lean'
];

const LANGUAGES_LIST = [
    'English', 'Hindi', 'Spanish', 'French', 'German', 'Portuguese', 'Mandarin', 'Chinese', 'Japanese', 'Korean',
    'Arabic', 'Russian', 'Italian', 'Dutch', 'Swedish', 'Norwegian', 'Danish', 'Finnish', 'Polish', 'Turkish',
    'Gujarati', 'Marathi', 'Telugu', 'Tamil', 'Kannada', 'Malayalam', 'Bengali', 'Punjabi', 'Urdu',
    'Yoruba', 'Swahili', 'Zulu', 'Amharic', 'Irish', 'Welsh', 'Greek', 'Hebrew', 'Persian', 'Farsi',
    'Indonesian', 'Malay', 'Thai', 'Vietnamese', 'Tagalog'
];
// Preset filter options
const PRESET_LANGUAGES = ['English', 'Hindi', 'Telugu', 'Spanish', 'French', 'German', 'Mandarin', 'Japanese', 'Arabic'];
const MAJOR_COMPANIES = [
    'Google', 'Microsoft', 'Amazon', 'Apple', 'Meta', 'Netflix', 'Tesla', 'Uber', 'Airbnb', 'Twitter', 'LinkedIn',
    'Salesforce', 'Adobe', 'Oracle', 'IBM', 'SAP', 'Infosys', 'TCS', 'Wipro', 'HCL Technologies', 'Cognizant',
    'Accenture', 'Deloitte', 'McKinsey', 'BCG', 'Capgemini', 'Fujitsu', 'HP', 'Dell', 'Intel', 'Nvidia',
    'Stripe', 'PayPal', 'Square', 'Shopify', 'Atlassian', 'ServiceNow', 'Workday', 'Snowflake', 'Databricks',
    'Zoom', 'Slack', 'Dropbox', 'GitHub', 'GitLab', 'HashiCorp', 'Docker', 'Kubernetes', 'Redis Labs',
    'Goldman Sachs', 'JPMorgan', 'Morgan Stanley', 'Citi', 'HSBC', 'Barclays', 'Deutsche Bank',
    'ByteDance', 'Tencent', 'Alibaba', 'Baidu', 'Samsung', 'Sony', 'Hitachi', 'Panasonic', 'LG'
];
const QUALIFICATIONS = [
    'B.Tech', 'B.E', 'B.Sc', 'B.Com', 'B.A', 'B.B.A', 'B.C.A', 'B.Arch', 'MBBS', 'B.Pharm', 'LL.B',
    'M.Tech', 'M.E', 'M.Sc', 'M.Com', 'M.A', 'M.B.A', 'M.C.A', 'M.Arch', 'M.Pharm', 'LL.M',
    'PhD', 'Ph.D', 'Doctor of Philosophy', 'Post-Doctoral', 'DBA',
    'Diploma', 'Advanced Diploma', 'Polytechnic Diploma', 'ITI',
    '10th / SSC', '12th / HSC', 'Associate Degree', 'High School'
];
const DEGREE_FIELDS = [
    'Computer Science', 'CSE', 'Information Technology', 'IT', 'Computer Engineering',
    'Electronics and Communication', 'ECE', 'Electrical Engineering', 'EEE',
    'Mechanical Engineering', 'Civil Engineering', 'Chemical Engineering', 'Aerospace Engineering',
    'Data Science', 'Artificial Intelligence', 'Machine Learning', 'Cybersecurity',
    'Software Engineering', 'Systems Engineering', 'Biomedical Engineering', 'Biotechnology',
    'MBA', 'Finance', 'Marketing', 'Human Resources', 'Operations Management', 'Business Analytics',
    'Physics', 'Mathematics', 'Statistics', 'Economics', 'Commerce', 'Accounting',
    'Architecture', 'Design', 'Arts', 'Literature', 'Psychology', 'Pharmacy', 'Medicine'
];

// ── Text Extraction ───────────────────────────────────────
async function extractTextFromFile(file) {
    const name = file.name.toLowerCase();
    try {
        if (name.endsWith('.pdf')) return await extractPDF(file);
        if (name.endsWith('.docx')) return await extractDOCX(file);
        // .doc — try as text (works for some older docs)
        return await new Promise(res => {
            const reader = new FileReader();
            reader.onload = () => res(reader.result || '');
            reader.onerror = () => res('');
            reader.readAsText(file);
        });
    } catch { return ''; }
}

async function extractPDF(file) {
    const buf = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
    const pages = [];
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        // Preserve line breaks using y-position changes
        const items = content.items;
        let lastY = null, lineText = '';
        const lines = [];
        for (const item of items) {
            if (lastY !== null && Math.abs(item.transform[5] - lastY) > 2) {
                if (lineText.trim()) lines.push(lineText.trim());
                lineText = '';
            }
            lineText += item.str;
            lastY = item.transform[5];
        }
        if (lineText.trim()) lines.push(lineText.trim());
        pages.push(lines.join('\n'));
    }
    return pages.join('\n');
}

async function extractDOCX(file) {
    const buf = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer: buf });
    return result.value || '';
}

// ── Resume Field Extraction ───────────────────────────────
function parseName(lines) {
    const skip = /^(resume|curriculum|vitae|profile|summary|objective|contact|phone|email|address|linkedin|github|skills|experience|education|certification|reference|portfolio|www\.|http|@|\+\d|\d{3}[-.\s]\d)/i;
    for (const line of lines.slice(0, 12)) {
        const l = line.trim().replace(/[|•·,;:_]/g, ' ').replace(/\s+/g, ' ').trim();
        if (!l || l.length < 4 || l.length > 55) continue;
        if (skip.test(l)) continue;
        if (/@|https?:|linkedin|github/i.test(l)) continue;
        if (/\d{4}/.test(l)) continue;
        const words = l.split(/\s+/);
        if (words.length < 2 || words.length > 5) continue;
        if (/[^a-zA-Z\s'\-.]/.test(l)) continue;
        const looksLikeName = words.every(w => /^[A-Z][a-z]{1,}$/.test(w) || /^[A-Z]{1,3}\.?$/.test(w) || /^[A-Z][a-z]+-[A-Z][a-z]+$/.test(w));
        if (looksLikeName) return words.join(' ');
    }
    // fallback: first non-empty short line
    for (const line of lines.slice(0, 6)) {
        const l = line.trim();
        if (l && !skip.test(l) && !/@/.test(l) && l.length < 60 && l.length > 3) return l;
    }
    return '';
}

function parseEmail(text) {
    const m = text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
    return m ? m[0] : '';
}

function parsePhone(text) {
    const m = text.match(/(?:\+?\d[\d\s\-().]{7,18}\d)/);
    return m ? m[0].trim() : '';
}

function parseLinkedIn(text) {
    const m = text.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/([a-zA-Z0-9\-_%]+)/i);
    return m ? `linkedin.com/in/${m[1]}` : '';
}

function parseSkills(text) {
    const lower = text.toLowerCase();
    return ALL_SKILLS.filter(s => {
        const sl = s.toLowerCase();
        // match whole word/phrase
        const re = new RegExp('(?<![a-z])' + sl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '[\\s\\.\\-]+') + '(?![a-z])', 'i');
        return re.test(lower);
    });
}

function parseCertifications(text) {
    return ALL_CERTS.filter(c => {
        const re = new RegExp(c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        return re.test(text);
    });
}

function parseLanguages(text) {
    // Look for a languages section first
    const langSection = text.match(/(?:languages?|spoken|linguistic)[:\s]*([^\n]{0,200})/i);
    const found = new Set();
    const check = (chunk) => {
        LANGUAGES_LIST.forEach(lang => {
            if (new RegExp('\\b' + lang + '\\b', 'i').test(chunk)) found.add(lang);
        });
    };
    if (langSection) check(langSection[1]);
    if (found.size === 0) check(text); // scan whole text if needed
    return [...found].slice(0, 8);
}

function parseExperience(text) {
    // Method 1: explicit "X years"
    const exp = text.match(/(\d+)\+?\s*years?\s*(?:of\s+)?(?:(?:overall|total|professional|work|industry)\s+)?experience/i);
    if (exp) return Math.min(parseInt(exp[1]), 40);
    // Method 2: year ranges
    const yr = new Date().getFullYear();
    const ranges = [];
    const re = /\b((?:19|20)\d{2})\s*[-–—]\s*((?:19|20)\d{2}|present|current|now|till date)\b/gi;
    let m;
    while ((m = re.exec(text)) !== null) {
        const s = parseInt(m[1]);
        const e = /present|current|now|till/i.test(m[2]) ? yr : parseInt(m[2]);
        if (s >= 1990 && e >= s && e <= yr + 1) ranges.push([s, e]);
    }
    if (ranges.length > 0) {
        const earliest = Math.min(...ranges.map(r => r[0]));
        return Math.min(yr - earliest, 40);
    }
    return 0;
}

function parseTitle(lines, text) {
    const titleKws = /engineer|developer|architect|scientist|analyst|manager|designer|consultant|lead|director|specialist|head|officer|president|executive|intern|trainee|associate|coordinator|administrator|researcher|professor|lecturer|teacher/i;
    // Check first 8 lines for a title-like line
    for (const line of lines.slice(1, 8)) {
        const l = line.trim();
        if (!l || l.length < 5 || l.length > 100) continue;
        if (titleKws.test(l) && !/^\d/.test(l) && !/@/.test(l)) return l.slice(0, 80);
    }
    // Fallback: scan for most recent job title
    const m = text.match(/(?:^\s*|\n\s*)((?:\w+\s){1,5}(?:Engineer|Developer|Manager|Designer|Analyst|Architect|Scientist|Director|Lead|Consultant)(?:\s*[|,]\s*\w+)?)/im);
    return m ? m[1].trim().slice(0, 80) : 'Professional';
}

function parseEducation(lines) {
    const degreeKw = /\b(b\.?tech|b\.?e\.?|b\.?sc|b\.?s\.?|m\.?tech|m\.?e\.?|m\.?sc|m\.?s\.?|mba|phd|ph\.?d|bachelor|master|doctor|bca|mca|diploma|b\.?com|m\.?com|b\.?a\.?|m\.?a\.?|llb|llm)\b/i;
    for (const line of lines) {
        if (degreeKw.test(line)) return line.trim().slice(0, 120);
    }
    return '';
}

function parseCompanies(lines, text) {
    const dateNear = /\b((?:19|20)\d{2})\b/;
    const titleKw = /engineer|developer|architect|scientist|analyst|manager|designer|lead|intern|consultant|specialist|director|head|officer|executive|trainee|associate|coordinator/i;
    const skip = /^[•\-\*▪◦➤→]|^\d+\.|^https?:|@|education|skills|certif|language|reference|objective|summary|contact|project/i;
    const orgs = new Set();

    for (let i = 0; i < lines.length; i++) {
        const l = lines[i].trim();
        if (!l || l.length < 2 || l.length > 70) continue;
        if (skip.test(l)) continue;
        if (!dateNear.test([lines[i - 1] || '', l, lines[i + 1] || '', lines[i + 2] || ''].join(' '))) continue;
        if (titleKw.test(l)) continue;
        if (/@/.test(l)) continue;
        const words = l.split(/\s+/);
        if (words.length < 1 || words.length > 6) continue;
        if (/^[A-Z]/.test(l) && !/^\d/.test(l)) {
            orgs.add(l.replace(/[,|–\-]\s*.*/, '').trim());
            if (orgs.size >= 5) break;
        }
    }
    return [...orgs].slice(0, 5);
}

function parseAvailability(text) {
    if (/immediate|available now|available immediately|notice period.*0/i.test(text)) return 'immediate';
    if (/2 weeks|two weeks|14 days/i.test(text)) return '2weeks';
    if (/1 month|one month|30 days/i.test(text)) return '1month';
    return 'negotiable';
}

function parseQualification(text) {
    const found = QUALIFICATIONS.filter(q => new RegExp('\\b' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i').test(text));
    return found[0] || '';
}
function parseDegreeField(text) {
    const found = DEGREE_FIELDS.filter(d => {
        const main = d.split('/')[0].trim();
        return new RegExp('\\b' + main.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i').test(text);
    });
    return found[0] || '';
}
function parseResumeText(text, fileName) {
    const lines = text.split(/\n/).map(l => l.trim()).filter(l => l.length > 0);
    const name = parseName(lines) || fileToName(fileName);
    return {
        name,
        email: parseEmail(text),
        phone: parsePhone(text),
        linkedin: parseLinkedIn(text),
        title: parseTitle(lines, text),
        education: parseEducation(lines),
        experience: parseExperience(text),
        skills: parseSkills(text),
        certifications: parseCertifications(text),
        languages: parseLanguages(text),
        companies: parseCompanies(lines, text),
        availability: parseAvailability(text),
        qualification: parseQualification(text),
        degreeField: parseDegreeField(text)
    };
}

function fileToName(fileName) {
    // Best-effort name from filename e.g. "john_smith_resume.pdf" → "John Smith"
    return fileName.replace(/\.(pdf|doc|docx)$/i, '').replace(/[_\-\.]+/g, ' ')
        .replace(/\b(resume|cv|curriculum|vitae|my|final|updated|new|latest)\b/gi, '')
        .replace(/\s+/g, ' ').trim()
        .split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
        || 'Unknown Candidate';
}

// ── JD Analysis ───────────────────────────────────────────
function analyzeJobDescription(title, jdText) {
    const text = (title + ' ' + jdText).toLowerCase();
    const required = ALL_SKILLS.filter(s => {
        const re = new RegExp('(?<![a-z])' + s.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/, '[\\s.\\-]+') + '(?![a-z])', 'i');
        return re.test(text);
    });
    // if too few detected, add from title context
    if (required.length < 3) {
        const tl = title.toLowerCase();
        const suggest = {
            react: ['React', 'JavaScript', 'TypeScript', 'CSS', 'HTML', 'Node.js'],
            frontend: ['React', 'JavaScript', 'TypeScript', 'CSS', 'HTML'],
            backend: ['Node.js', 'Python', 'Java', 'SQL', 'REST APIs', 'Docker'],
            python: ['Python', 'SQL', 'Machine Learning', 'Pandas', 'NumPy'],
            java: ['Java', 'Spring Boot', 'SQL', 'Microservices', 'Docker'],
            devops: ['Docker', 'Kubernetes', 'AWS', 'CI/CD', 'Terraform', 'Linux'],
            cloud: ['AWS', 'Docker', 'Kubernetes', 'Terraform', 'Python'],
            data: ['Python', 'SQL', 'Machine Learning', 'Pandas', 'Spark', 'Tableau'],
            ml: ['Python', 'TensorFlow', 'PyTorch', 'Machine Learning', 'Pandas'],
            mobile: ['React Native', 'Swift', 'Kotlin', 'Android', 'iOS'],
            fullstack: ['React', 'Node.js', 'JavaScript', 'TypeScript', 'SQL'],
            security: ['Penetration Testing', 'Python', 'OWASP', 'Linux', 'SIEM']
        };
        for (const [kw, skills] of Object.entries(suggest)) {
            if (tl.includes(kw)) { required.push(...skills.filter(s => !required.includes(s))); break; }
        }
    }
    // preferred = remaining skills mentioned  
    const preferred = ALL_SKILLS.filter(s => !required.includes(s) && text.includes(s.toLowerCase().split(' ')[0]));
    const expMatch = text.match(/(\d+)\+?\s*years?/i);
    const reqCerts = ALL_CERTS.filter(c => new RegExp(c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(text));
    return {
        requiredSkills: [...new Set(required)].slice(0, 7),
        preferredSkills: [...new Set(preferred)].slice(0, 5),
        minExperience: expMatch ? parseInt(expMatch[1]) : 2,
        certifications: reqCerts.slice(0, 4)
    };
}

// ── Match Score Engine ────────────────────────────────────
function computeMatchScore(candidate, jdAnalysis, jdText) {
    const jdLower = jdText.toLowerCase();
    const candSkillsL = (candidate.skills || []).map(s => s.toLowerCase());

    // Skills (40 pts)
    const req = jdAnalysis.requiredSkills;
    const pref = jdAnalysis.preferredSkills;
    let skillPts = 0;
    if (req.length > 0) {
        const hits = req.filter(s => candSkillsL.some(cs => cs.includes(s.toLowerCase()) || s.toLowerCase().includes(cs)));
        skillPts += Math.round((hits.length / req.length) * 30);
    }
    const prefHits = pref.filter(s => candSkillsL.some(cs => cs.includes(s.toLowerCase()) || s.toLowerCase().includes(cs)));
    skillPts += Math.min(10, Math.round((prefHits.length / Math.max(pref.length, 1)) * 10));

    // Experience (25 pts)
    const minE = jdAnalysis.minExperience;
    let expPts = candidate.experience >= minE ? 25 : Math.round((candidate.experience / Math.max(minE, 1)) * 20);

    // Certifications (15 pts)
    const reqC = jdAnalysis.certifications;
    let certPts = 0;
    if (reqC.length === 0) {
        certPts = Math.min(15, (candidate.certifications || []).length * 5);
    } else {
        const ci = reqC.filter(c => (candidate.certifications || []).some(cc => cc.toLowerCase().includes(c.toLowerCase().split(' ')[0])));
        certPts = Math.round((ci.length / reqC.length) * 15);
    }

    // Keyword density (20 pts)
    const allCandWords = [...(candidate.skills || []), ...(candidate.certifications || []), candidate.title || '', candidate.education || ''].join(' ').toLowerCase();
    const jdWords = [...new Set(jdLower.split(/\W+/).filter(w => w.length > 4))];
    const kd = jdWords.filter(w => allCandWords.includes(w)).length;
    const kdPts = Math.min(20, Math.round((kd / Math.max(jdWords.length, 1)) * 60));

    const total = Math.min(100, Math.max(0, skillPts + expPts + certPts + kdPts));
    return {
        total,
        breakdown: {
            skills: Math.min(100, Math.round((skillPts / 40) * 100)),
            experience: Math.min(100, Math.round((expPts / 25) * 100)),
            certifications: Math.min(100, Math.round((certPts / 15) * 100))
        }
    };
}

// ── File Upload UI ────────────────────────────────────────
const dropZone = $('drop-zone');
const fileInput = $('file-input');

dropZone.addEventListener('click', e => { if (!e.target.classList.contains('drop-link')) fileInput.click(); });
dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('dragging'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragging'));
dropZone.addEventListener('drop', e => { e.preventDefault(); dropZone.classList.remove('dragging'); addFiles([...e.dataTransfer.files]); });
fileInput.addEventListener('change', () => addFiles([...fileInput.files]));

function addFiles(incoming) {
    const allowed = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    const valid = incoming.filter(f => allowed.includes(f.type) || /\.(pdf|doc|docx)$/i.test(f.name));
    state.files.push(...valid.slice(0, 100 - state.files.length));
    renderFileList(); updateAnalyzeBtn(); fileInput.value = '';
}
function removeFile(idx) { state.files.splice(idx, 1); renderFileList(); updateAnalyzeBtn(); }

function renderFileList() {
    const list = $('file-list'), stats = $('upload-stats'), counter = $('file-counter-badge'), btnC = $('btn-file-count');
    counter.textContent = `${state.files.length} / 100`;
    btnC.textContent = state.files.length > 0 ? `${state.files.length} files` : '';
    btnC.style.display = state.files.length > 0 ? 'inline' : 'none';
    if (!state.files.length) { list.innerHTML = ''; stats.style.display = 'none'; return; }
    stats.style.display = 'block';
    let pdfs = 0, docs = 0, total = 0;
    list.innerHTML = state.files.map((f, i) => {
        const isPdf = /\.pdf$/i.test(f.name); if (isPdf) pdfs++; else docs++;
        total += f.size;
        const sz = f.size < 1048576 ? `${Math.round(f.size / 1024)} KB` : `${(f.size / 1048576).toFixed(1)} MB`;
        return `<div class="file-item"><span class="file-item-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></span><span class="file-item-name" title="${f.name}">${f.name}</span><span class="file-item-size">${sz}</span><button class="file-item-remove" onclick="removeFile(${i})"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>`;
    }).join('');
    const tsz = total < 1048576 ? `${Math.round(total / 1024)} KB` : `${(total / 1048576).toFixed(1)} MB`;
    $('pdf-count-label').textContent = `${pdfs} PDF file${pdfs !== 1 ? 's' : ''}`;
    $('doc-count-label').textContent = `${docs} DOC/DOCX file${docs !== 1 ? 's' : ''}`;
    $('total-size-label').textContent = `${tsz} total`;
}

function updateAnalyzeBtn() {
    const btn = $('btn-analyze');
    btn.disabled = !(state.files.length > 0 && $('job-title').value.trim() && $('job-description').value.trim().length > 10);
}
$('job-title').addEventListener('input', updateAnalyzeBtn);
$('job-description').addEventListener('input', updateAnalyzeBtn);

// ── Analysis Flow ─────────────────────────────────────────
function startAnalysis() {
    state.jobTitle = $('job-title').value.trim();
    state.jobDescription = $('job-description').value.trim();
    showScreen('screen-processing');
    // Start real processing immediately (in parallel with animation)
    state.processingPromise = processAllFiles();
    runProcessingAnimation();
}

async function processAllFiles() {
    state.jdAnalysis = analyzeJobDescription(state.jobTitle, state.jobDescription);
    const results = await Promise.all(state.files.map(async (file, idx) => {
        try {
            const text = await extractTextFromFile(file);
            if (text && text.trim().length > 50) {
                const parsed = parseResumeText(text, file.name);
                // Ensure we have at least a name
                if (!parsed.name || parsed.name.length < 2) parsed.name = fileToName(file.name);
                // Ensure minimal skill set (if text was too short/unstructured)
                if (parsed.skills.length === 0 && text.length > 100) {
                    parsed.skills = parseSkills(text.replace(/\s+/g, ' '));
                }
                const score = computeMatchScore(parsed, state.jdAnalysis, state.jobDescription);
                return { id: `c-${Date.now()}-${idx}`, fileName: file.name, ...parsed, matchScore: score.total, breakdown: score.breakdown };
            }
        } catch (e) { console.warn('Parse error for', file.name, e); }
        // Fallback: name from filename, everything else empty
        const fallback = { name: fileToName(file.name), email: '', phone: '', linkedin: '', title: 'Candidate', education: '', experience: 0, skills: [], certifications: [], languages: ['English'], companies: [], availability: 'negotiable' };
        const score = computeMatchScore(fallback, state.jdAnalysis, state.jobDescription);
        return { id: `c-${Date.now()}-${idx}`, fileName: file.name, ...fallback, matchScore: score.total, breakdown: score.breakdown };
    }));
    return results;
}

function runProcessingAnimation() {
    ['step-jd', 'step-parse', 'step-score', 'step-done'].forEach(id => $(id).dataset.state = 'pending');
    $('progress-fill').style.width = '0%'; $('progress-pct').textContent = '0%';
    $('proc-sub').textContent = 'Initializing...';
    const total = state.files.length;
    const steps = [
        { at: 300, pct: 10, id: 'step-jd', st: 'active', sub: 'Analyzing job requirements...' },
        { at: 1200, pct: 25, id: 'step-jd', st: 'done', sub: `Parsing ${total} resume${total !== 1 ? 's' : ''}...` },
        { at: 1400, pct: 28, id: 'step-parse', st: 'active', sub: `Extracting text from ${total} file${total !== 1 ? 's' : ''}...` },
        { at: 3200, pct: 62, id: 'step-parse', st: 'done', sub: 'Running AI scoring engine...' },
        { at: 3400, pct: 68, id: 'step-score', st: 'active', sub: 'Calculating match scores...' },
        { at: 4500, pct: 88, id: 'step-score', st: 'done', sub: 'Ranking candidates...' },
        { at: 4800, pct: 95, id: 'step-done', st: 'active', sub: 'Finalizing results...' },
    ];
    steps.forEach(({ at, pct, id, st, sub }) => setTimeout(() => { setProgress(pct); $(id).dataset.state = st; $('proc-sub').textContent = sub; }, at));

    // After animation minimum + processing done → show results
    const animMin = new Promise(res => setTimeout(res, 5200));
    Promise.all([animMin, state.processingPromise]).then(([, candidates]) => {
        setProgress(100); $('step-done').dataset.state = 'done';
        $('proc-sub').textContent = `${candidates.length} candidate${candidates.length !== 1 ? 's' : ''} scored!`;
        setTimeout(() => finishAnalysis(candidates), 600);
    });
}

function setProgress(pct) {
    $('progress-fill').style.width = pct + '%';
    $('progress-pct').textContent = pct + '%';
}

function finishAnalysis(candidates) {
    state.candidates = candidates.sort((a, b) => b.matchScore - a.matchScore);
    state.candidates.forEach((c, i) => { c.rank = i + 1; });

    state.allSkills.clear(); state.allCerts.clear(); state.allLanguages.clear(); state.allCompanies.clear();
    state.candidates.forEach(c => {
        (c.skills || []).forEach(s => state.allSkills.add(s));
        (c.certifications || []).forEach(ct => state.allCerts.add(ct));
        (c.languages || []).forEach(l => state.allLanguages.add(l));
        (c.companies || []).forEach(co => state.allCompanies.add(co));
    });

    const allSkillOptions = [...new Set([...PROGRAMMING_LANGUAGES, ...ALL_SKILLS, ...state.allSkills])].sort((a, b) => a.localeCompare(b));
    const allCertOptions = [...new Set([...ALL_CERTS, ...state.allCerts])].sort((a, b) => a.localeCompare(b));
    const allLangOptions = [...new Set([...PRESET_LANGUAGES, ...state.allLanguages])].sort((a, b) => a.localeCompare(b));
    const allCompanyOptions = [...new Set([...MAJOR_COMPANIES, ...state.allCompanies])].sort((a, b) => a.localeCompare(b));
    buildSearchableDropdown('skill-dd-list', allSkillOptions, 'skill');
    buildSearchableDropdown('cert-dd-list', allCertOptions, 'cert');
    buildSearchableDropdown('lang-dd-list', allLangOptions, 'lang');
    buildSearchableDropdown('company-dd-list', allCompanyOptions, 'company');
    buildSearchableDropdown('qual-dd-list', QUALIFICATIONS, 'qual');
    buildSearchableDropdown('degree-dd-list', DEGREE_FIELDS, 'degree');

    $('jda-title').textContent = state.jobTitle.toUpperCase();
    $('jda-required-skills').innerHTML = state.jdAnalysis.requiredSkills.map(s => `<span class="skill-pill">${s}</span>`).join('');
    $('jda-preferred-skills').innerHTML = state.jdAnalysis.preferredSkills.map(s => `<span class="skill-pill">${s}</span>`).join('');
    $('jda-exp-text').textContent = `${state.jdAnalysis.minExperience}+ years required`;

    resetFilters(); applyFilters(); updateStats();
    showScreen('screen-results');
}

// ── Experience Dual Slider ─────────────────────────────────
function syncExpSliders(which) {
    let mn = parseInt($('filter-exp-min').value);
    let mx = parseInt($('filter-exp-max').value);
    if (mn > mx) { if (which === 'min') { mx = mn; $('filter-exp-max').value = mx; } else { mn = mx; $('filter-exp-min').value = mn; } }
    $('exp-min-display').textContent = mn + ' yrs';
    $('exp-max-display').textContent = mx + ' yrs';
    const fill = $('exp-range-fill');
    if (fill) { fill.style.left = (mn / 30 * 100) + '%'; fill.style.width = ((mx - mn) / 30 * 100) + '%'; }
    applyFilters();
}

// ── Filters ───────────────────────────────────────────────
function applyFilters() {
    const minScore = parseInt($('filter-score').value);
    const expMin = parseInt($('filter-exp-min').value) || 0;
    const expMax = parseInt($('filter-exp-max').value) || 30;
    const avail = $('filter-availability').value;
    const li = $('filter-linkedin').value;
    const keywords = ($('filter-keywords').value || '').toLowerCase().trim();
    const kwList = keywords ? keywords.split(/[,\s]+/).filter(k => k.length > 1) : [];

    $('score-val-display').textContent = minScore + '%';
    const pct = minScore + '%';
    $('filter-score').style.background = `linear-gradient(to right,var(--purple-500) ${pct},rgba(255,255,255,0.12) ${pct})`;

    let list = state.candidates.filter(c => {
        if (c.matchScore < minScore) return false;
        if (c.experience < expMin || c.experience > expMax) return false;
        if (avail && c.availability !== avail) return false;
        if (li === 'has' && !c.linkedin) return false;
        if (li === 'no' && c.linkedin) return false;
        const cskL = (c.skills || []).map(s => s.toLowerCase());
        if (state.filters.skills.length && !state.filters.skills.every(fs => cskL.some(cs => cs.includes(fs.toLowerCase()) || fs.toLowerCase().includes(cs)))) return false;
        if (state.filters.certifications.length && !state.filters.certifications.every(fc => (c.certifications || []).some(cc => cc.toLowerCase().includes(fc.toLowerCase())))) return false;
        if (state.filters.languages.length && !state.filters.languages.every(fl => (c.languages || []).some(cl => cl.toLowerCase() === fl.toLowerCase()))) return false;
        if (state.filters.companies.length && !state.filters.companies.every(fc => (c.companies || []).some(cc => cc.toLowerCase().includes(fc.toLowerCase())))) return false;
        if (state.filters.qualifications.length && !state.filters.qualifications.some(fq => (c.qualification || '').toLowerCase().includes(fq.toLowerCase()))) return false;
        if (state.filters.degrees.length && !state.filters.degrees.some(fd => (c.degreeField || '').toLowerCase().includes(fd.toLowerCase()))) return false;
        if (kwList.length) {
            const blob = [c.name, c.title, c.education, c.qualification, c.degreeField, ...(c.skills || []), ...(c.certifications || []), ...(c.companies || []), ...(c.languages || [])].join(' ').toLowerCase();
            if (!kwList.every(kw => blob.includes(kw))) return false;
        }
        return true;
    });
    list = sortCandidates(list);
    state.filteredCandidates = list;
    renderCandidates(list); updateStats();
}

function sortCandidates(list) {
    return [...list].sort((a, b) => {
        switch (state.sortMode) {
            case 'score-asc': return a.matchScore - b.matchScore;
            case 'name-asc': return a.name.localeCompare(b.name);
            case 'exp-desc': return b.experience - a.experience;
            default: return b.matchScore - a.matchScore;
        }
    });
}
function changeSort(m) { state.sortMode = m; applyFilters(); }
function clearAllFilters() { resetFilters(); applyFilters(); }
function resetFilters() {
    $('filter-score').value = 0; $('filter-exp-min').value = 0; $('filter-exp-max').value = 30;
    $('filter-availability').value = ''; $('filter-linkedin').value = '';
    if ($('filter-keywords')) $('filter-keywords').value = '';
    state.filters.skills = []; state.filters.certifications = []; state.filters.languages = [];
    state.filters.companies = []; state.filters.qualifications = []; state.filters.degrees = []; state.filters.keywords = '';
    syncExpSliders('min');
    renderTags();
}

// ── Multi Select ──────────────────────────────────────────
const FILTER_MAP = { skill: 'skills', cert: 'certifications', lang: 'languages', company: 'companies', qual: 'qualifications', degree: 'degrees' };
function buildSearchableDropdown(listId, options, type) {
    $(listId).innerHTML = options.map(o => `<div class="ms-option" onclick="selectOption('${type}','${o.replace(/'/g, "\\'").replace(/"/g, '&quot;')}',this)">${esc(o)}</div>`).join('');
}
function filterDropdown(ddId, query) {
    const q = query.toLowerCase();
    const listId = ddId + '-list';
    const list = $(listId);
    if (!list) return;
    list.querySelectorAll('.ms-option').forEach(el => {
        el.style.display = el.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
}
function toggleDropdown(ddId) {
    document.querySelectorAll('.ms-dropdown').forEach(d => { if (d.id !== ddId) d.classList.remove('open'); });
    $(ddId).classList.toggle('open');
    // Reset search when opening
    const srch = $(ddId) && $(ddId).querySelector('.ms-search');
    if ($(ddId).classList.contains('open') && srch) { srch.value = ''; filterDropdown(ddId, ''); srch.focus(); }
}
document.addEventListener('click', e => { if (!e.target.closest('.multi-select')) document.querySelectorAll('.ms-dropdown').forEach(d => d.classList.remove('open')); });
function selectOption(type, value, el) {
    const key = FILTER_MAP[type];
    if (!state.filters[key].includes(value)) { state.filters[key].push(value); renderTags(); applyFilters(); }
    el.closest('.ms-dropdown').classList.remove('open');
}
function addCustomOption(type, inputId) {
    const val = $(inputId).value.trim();
    if (!val) return;
    const key = FILTER_MAP[type];
    if (!state.filters[key].includes(val)) { state.filters[key].push(val); renderTags(); applyFilters(); }
    $(inputId).value = '';
}
function removeTag(type, value) {
    const key = FILTER_MAP[type];
    state.filters[key] = state.filters[key].filter(v => v !== value);
    renderTags(); applyFilters();
}
function renderTags() {
    [['skill', 'skills', 'skill-tags'], ['cert', 'certifications', 'cert-tags'], ['lang', 'languages', 'lang-tags'],
    ['company', 'companies', 'company-tags'], ['qual', 'qualifications', 'qual-tags'], ['degree', 'degrees', 'degree-tags']].forEach(([type, key, cid]) => {
        const el = $(cid); if (!el) return;
        el.innerHTML = state.filters[key].map(v => `<span class="tag">${esc(v)} <span class="tag-remove" onclick="removeTag('${type}','${v.replace(/'/g, "\\'")}')">✕</span></span>`).join('');
    });
}

// ── Render Candidates ─────────────────────────────────────
function renderCandidates(cands) {
    const list = $('candidate-list'), noR = $('no-results'), cEl = $('results-count');
    cEl.textContent = `${cands.length} of ${state.candidates.length} shown`;
    if (!cands.length) { list.innerHTML = ''; noR.style.display = 'block'; return; }
    noR.style.display = 'none';
    list.innerHTML = cands.map((c, i) => buildCard(c, i + 1)).join('');
    setTimeout(() => {
        cands.forEach(c => {
            const g = document.querySelector(`[data-id="${c.id}"] .score-gauge-fill`);
            if (g) { const r = 29, ci = 2 * Math.PI * r; g.style.strokeDasharray = ci; g.style.strokeDashoffset = ci - (c.matchScore / 100) * ci; }
            [['skil-bar', 'skills'], ['exp-bar', 'experience'], ['cert-bar', 'certifications']].forEach(([cls, key]) => {
                const b = document.querySelector(`[data-id="${c.id}"] .bar-fill.${cls}`);
                if (b) b.style.width = (c.breakdown[key] || 0) + '%';
            });
        });
    }, 50);
}

function buildCard(c, rank) {
    const sc = c.matchScore >= 70 ? 'score-high' : c.matchScore >= 40 ? 'score-medium' : 'score-low';
    const rb = rank <= 3 ? `<div class="rank-badge rank-${rank}">#${rank}</div>` : `<div class="rank-badge rank-other">#${rank}</div>`;
    const r = 29, ci = 2 * Math.PI * r;
    const avMap = { immediate: 'Immediate', '2weeks': '2 Weeks', '1month': '1 Month', negotiable: 'Negotiable' };
    const liLink = c.linkedin ? `<a href="https://${c.linkedin}" target="_blank" class="linkedin-badge">in</a>` : '';
    const sel = state.selectedIds.has(c.id);
    const skillsToShow = (c.skills || []).slice(0, 8);
    const certsToShow = (c.certifications || []);
    const companiesArr = (c.companies || []);
    const langsArr = (c.languages || []);

    return `<div class="candidate-card${sel ? ' selected' : ''}" data-id="${c.id}">
  <div class="candidate-main" onclick="toggleExpand('${c.id}')">
    ${rb}
    <div class="score-gauge-wrap ${sc}">
      <svg width="70" height="70" viewBox="0 0 70 70"><circle class="score-gauge-bg" cx="35" cy="35" r="${r}"/><circle class="score-gauge-fill" cx="35" cy="35" r="${r}" stroke-dasharray="${ci}" stroke-dashoffset="${ci}"/></svg>
      <div class="score-gauge-text"><div class="score-num">${c.matchScore}</div><div class="score-pct">%</div></div>
    </div>
    <div class="candidate-info">
      <div class="candidate-name-row"><span class="candidate-name">${esc(c.name)}</span>${liLink}</div>
      <div class="candidate-title">${esc(c.title || 'Candidate')}</div>
      <div class="candidate-meta">
        <span class="c-meta-item"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>${c.experience} yr${c.experience !== 1 ? 's' : ''} exp</span>
        <span class="c-meta-item"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>${avMap[c.availability] || 'Negotiable'}</span>
        ${langsArr.length ? `<span class="c-meta-item"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>${langsArr.slice(0, 3).join(', ')}</span>` : ''}
      </div>
    </div>
    <div class="candidate-bars">
      <div class="bar-row"><span class="bar-label">Skills</span><div class="bar-track"><div class="bar-fill skil-bar" style="width:0%"></div></div><span class="bar-val">${c.breakdown.skills}%</span></div>
      <div class="bar-row"><span class="bar-label">Exp</span><div class="bar-track"><div class="bar-fill exp-bar" style="width:0%"></div></div><span class="bar-val">${c.breakdown.experience}%</span></div>
      <div class="bar-row"><span class="bar-label">Certs</span><div class="bar-track"><div class="bar-fill cert-bar" style="width:0%"></div></div><span class="bar-val">${c.breakdown.certifications}%</span></div>
    </div>
    <div class="card-actions" onclick="event.stopPropagation()">
      <input type="checkbox" class="candidate-cb" ${sel ? 'checked' : ''} onchange="toggleSelect('${c.id}',this.checked)"/>
      <div class="expand-btn" onclick="toggleExpand('${c.id}')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg></div>
    </div>
  </div>
  <div class="candidate-details">
    <div class="details-inner">
      <div class="detail-group">
        <div class="detail-group-title">📋 Skills ${skillsToShow.length === 0 ? '<span style="color:var(--text-muted);font-weight:normal">(not detected in resume)</span>' : ''}</div>
        <div class="detail-tags">${skillsToShow.map(s => { const hi = state.jdAnalysis.requiredSkills.some(r => r.toLowerCase() === s.toLowerCase()); return `<span class="detail-tag${hi ? ' highlight' : ''}">${esc(s)}</span>`; }).join('')}${skillsToShow.length === 0 ? '<span class="detail-info" style="font-size:0.78rem">Upload a text-based PDF/DOCX to detect skills</span>' : ''}</div>
      </div>
      <div class="detail-group">
        <div class="detail-group-title">🎓 Education & Certs</div>
        <div class="detail-info">${esc(c.education || 'Not detected')}</div>
        <div class="detail-tags" style="margin-top:8px">${certsToShow.map(ct => `<span class="detail-tag highlight">${esc(ct)}</span>`).join('')}</div>
      </div>
      <div class="detail-group">
        <div class="detail-group-title">🏢 Previous Companies</div>
        <div class="detail-tags">${companiesArr.length ? companiesArr.map(co => `<span class="detail-tag">${esc(co)}</span>`).join('') : '<span class="detail-info">Not detected</span>'}</div>
        <div class="detail-group-title" style="margin-top:12px">📞 Contact</div>
        <div class="detail-info">${esc(c.email || '—')}<br/>${esc(c.phone || '—')}</div>
        ${c.linkedin ? `<a href="https://${c.linkedin}" target="_blank" class="detail-link">🔗 ${esc(c.linkedin)}</a>` : ''}
        <div class="detail-group-title" style="margin-top:12px">📄 Source File</div>
        <div class="detail-info" style="font-size:0.75rem;color:var(--text-muted)">${esc(c.fileName)}</div>
      </div>
    </div>
  </div>
</div>`;
}

// ── Select / Stats / Export ───────────────────────────────
function toggleExpand(id) {
    const card = document.querySelector(`[data-id="${id}"]`);
    if (!card) return;
    const was = card.classList.contains('expanded');
    document.querySelectorAll('.candidate-card.expanded').forEach(c => c.classList.remove('expanded'));
    if (!was) card.classList.add('expanded');
}
function toggleSelect(id, checked) {
    if (checked) state.selectedIds.add(id); else state.selectedIds.delete(id);
    const card = document.querySelector(`[data-id="${id}"]`);
    if (card) card.classList.toggle('selected', checked);
    updateExportBtn(); updateSelectAll();
}
function toggleSelectAll() {
    const cb = $('select-all-cb');
    state.filteredCandidates.forEach(c => {
        if (cb.checked) state.selectedIds.add(c.id); else state.selectedIds.delete(c.id);
        const card = document.querySelector(`[data-id="${c.id}"]`);
        if (card) { card.classList.toggle('selected', cb.checked); const ccb = card.querySelector('.candidate-cb'); if (ccb) ccb.checked = cb.checked; }
    });
    updateExportBtn();
}
function updateSelectAll() {
    const cb = $('select-all-cb');
    const sel = state.filteredCandidates.filter(c => state.selectedIds.has(c.id)).length;
    if (!sel) { cb.checked = false; cb.indeterminate = false; }
    else if (sel === state.filteredCandidates.length) { cb.checked = true; cb.indeterminate = false; }
    else { cb.checked = false; cb.indeterminate = true; }
}
function updateExportBtn() {
    const n = state.selectedIds.size; $('selected-count').textContent = n; $('btn-export').disabled = n === 0;
}
function updateStats() {
    const vis = state.filteredCandidates.length ? state.filteredCandidates : state.candidates;
    const n = vis.length, avg = n ? Math.round(vis.reduce((s, c) => s + c.matchScore, 0) / n) : 0, top = vis.filter(c => c.matchScore >= 70).length;
    $('stat-total').textContent = `${n} candidates`; $('stat-avg').textContent = avg + '%'; $('stat-top').textContent = top;
}
function exportSelected() {
    const sel = state.candidates.filter(c => state.selectedIds.has(c.id));
    if (!sel.length) return;
    const hdr = ['Rank', 'Name', 'Title', 'Match Score', 'Experience (yrs)', 'Skills', 'Certifications', 'Languages', 'Previous Companies', 'Availability', 'Email', 'Phone', 'LinkedIn', 'Education', 'Source File'];
    const rows = sel.map(c => [c.rank, c.name, c.title || '', c.matchScore + '%', c.experience, (c.skills || []).join(';'), (c.certifications || []).join(';'), (c.languages || []).join(';'), (c.companies || []).join(';'), c.availability || '', c.email || '', c.phone || '', c.linkedin || '', c.education || '', c.fileName].map(v => `"${String(v).replace(/"/g, '""')}"`));
    const csv = [hdr.join(','), ...rows.map(r => r.join(','))].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `RecruitIQ_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
}
function resetToUpload() {
    state.files = []; state.candidates = []; state.filteredCandidates = []; state.selectedIds.clear(); state.sortMode = 'score-desc';
    state.filters = { minScore: 0, expMin: 0, expMax: 30, skills: [], certifications: [], languages: [], companies: [], availability: '', linkedin: '' };
    $('file-list').innerHTML = ''; $('upload-stats').style.display = 'none';
    $('file-counter-badge').textContent = '0 / 100'; $('btn-file-count').style.display = 'none';
    $('job-title').value = ''; $('job-description').value = ''; $('btn-analyze').disabled = true;
    showScreen('screen-upload');
}
function esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
