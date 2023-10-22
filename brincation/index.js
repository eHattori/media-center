const fs = require('fs');

const API_KEY = process.env.API_KEY;
const ENV = process.env.ENVIROMENT;
const ENDPOINT = 'https://api.openai.com/v1/chat/completions';

const PROMPT = 'Traduza os textos a seguir para o Português do Brasil, mantendo a estrutura original . Utilize o padrão de tradução XSC 1 e retorne as traduções no formato especificado ';


async function askToTranslateGPT(textToTranslate) {

    const requestOptions = {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            "model": 'gpt-4',
            "messages": [
                { "role": "system", "content": PROMPT },
                { "role": "user", "content": textToTranslate.replace(/<\/?i>|<\/?b>|\n/g, '') }
            ],
            "temperature": 0,
            "top_p": 1,
            "frequency_penalty": 0,
            "presence_penalty": 0
        })
    };
    console.log('Iniciando tradução ...');
    const data = await fetch(ENDPOINT, requestOptions);
    const response = await data.json();
    if (ENV === 'test' || ENV === 'debug') {
        console.log('Request enviada: ', requestOptions);
        console.log('Request Recebida: ', JSON.stringify(response, null, 3));
    }
    console.log('Tradução finalizada...');

    return response.choices[0].message.content;
}


function extractDataFromString(str) {
    const regex = /<TR IDX:"(\d+)" TXT:"(.*?)" TR>/g;
    const results = [];
    let match;
    while ((match = regex.exec(str)) !== null) {
        results.push({
            index: parseInt(match[1], 10),
            text: match[2]
        });
    }
    return results;
}

function updateDataArray(dataArray, stringData) {
    const extractedData = extractDataFromString(stringData);

    for (const data of extractedData) {
        const found = dataArray.find(item => parseInt(item.index) === parseInt(data.index));
        if (found) {
            found.text = data.text;
        }
    }
}

async function translate(blocks) {

    const textsToTranslate = [];
    let count = 1;

    let currentText = '';
    for (const block of blocks) {
        if (count == 30) {
            textsToTranslate.push(currentText);
            count = 1;
            currentText = '';
        }
        currentText += `<TR IDX:"${block.index}" TXT:"${block.text}" TR>`;
        count++;
    }
    textsToTranslate.push(currentText);
    console.log(`Se preparando para traduzir ... ${textsToTranslate.length} partes`);
    const responses = await Promise.all(textsToTranslate.map((el) => askToTranslateGPT(el)));

    console.log('Gerando arquivos');

    for (const translatedText of responses) {
        updateDataArray(blocks, translatedText);
    }
    return blocks;
}

function breakInBlocks(path) {

    const content = fs.readFileSync(path, 'utf-8').replace(/﻿/g, '');
    const blocks = content.replace(/\r\n|\r|\n/g, '\n').split(/\n{2,}/).map(block => {
        const lines = block.split('\n');

        return {
            index: lines[0],
            time: lines[1],
            text: lines.slice(2).join('\n')
        }
    });

    console.log(`Total de Blocks para buscar: ${blocks.length}`);
    return blocks;
}


function generateSrt(data, inputPath) {
    let srtContent = '';

    for (const entry of data) {
        srtContent += `${entry.index}\n${entry.time}\n${entry.text}\n\n`;
    }

    const filepath = inputPath.replace(/\.en(\.forced)?\.srt$/, '.pt-BR.srt');
    console.log(filepath);

    fs.openSync(filepath, 'w');
    fs.writeFileSync(filepath, srtContent);
}

const args = process.argv.slice(2);

const inputPath = args[0];
const blocks = breakInBlocks(inputPath);
console.log('Blocos encontrados: ', blocks.length);
if (ENV === 'test') {
    console.warn('Running in TEST mode!!!');
    translate([
        {
            index: '1',
            time: '00:01:11,196 --> 00:01:12,781',
            text: 'I got <b>everything</b> you <i>asked</i> for.'
        },
        {
            index: '2',
            time: '00:03:21,034 --> 00:03:24,787',
            text: "It's disconnected\nfrom the higher dimension"
        },
    ]).then((blocks) => {
        generateSrt(blocks, inputPath);
    });

} else {
    console.log('Running in PROD mode!!!');
    translate(blocks).then((blocks) => {
        generateSrt(blocks, inputPath);
    });
}


