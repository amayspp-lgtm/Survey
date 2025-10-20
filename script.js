document.addEventListener('DOMContentLoaded', function() {
    // GANTI DENGAN ENDPOINT API INTERNAL ANDA
    const API_SUBMIT_ENDPOINT = '/api/submit'; 
    
    // DOM Elements
    const introPage = document.getElementById('intro-page');
    const surveyPage = document.getElementById('survey-page');
    const startButton = document.getElementById('start-survey-button');
    const modeToggle = document.getElementById('mode-toggle');
    const questionSection = document.querySelector('.question-section');
    const progressBarFill = document.getElementById('progress-bar-fill');
    const progressText = document.getElementById('progress-text');
    
    // Status Global
    let currentQuestionId = 0; 
    const totalQuestions = 5; 
    const answers = {};

    // =======================================================
    // 1. MODE GELAP (DARK MODE) TOGGLE
    // =======================================================
    modeToggle.addEventListener('click', function() {
        document.body.classList.toggle('dark-mode');
        document.body.classList.toggle('light-mode');
        modeToggle.textContent = document.body.classList.contains('dark-mode') ? '☀️' : '🌙';
    });
    
    // =======================================================
    // 2. LOGIKA TRANSISI INTRO -> SURVEY
    // =======================================================
    startButton.addEventListener('click', function() {
        introPage.classList.remove('active');
        introPage.style.opacity = '0';
        introPage.style.transform = 'translateX(-100%)';

        setTimeout(() => {
            introPage.style.display = 'none';
            
            surveyPage.classList.remove('hidden'); 
            surveyPage.classList.add('active'); 
            
            showQuestion(1); 
        }, 500); 
    });
    
    // =======================================================
    // 3. FUNGSI NAVIGASI & UPDATE UI
    // =======================================================
    
    function updateProgressBar() {
        const progress = Math.min(currentQuestionId, totalQuestions);
        const percentage = Math.round((progress / totalQuestions) * 100);
        
        progressBarFill.style.width = percentage + '%';
        progressText.textContent = `${percentage}% Selesai (${progress} dari ${totalQuestions})`;
        
        document.querySelector('.survey-header').style.display = 
            (currentQuestionId >= 1 && currentQuestionId <= totalQuestions) ? 'flex' : 'none';
    }

    function validateQuestion(id) {
        const questionCard = document.querySelector(`.question-card[data-question-id="${id}"]`);
        if (!questionCard) return true;
        
        const type = questionCard.getAttribute('data-type');
        
        if (type === 'radio') {
            return questionCard.querySelector('input[type="radio"]:checked') !== null;
        } else if (type === 'text') {
            const inputs = questionCard.querySelectorAll('.text-input-field[required]');
            let isValid = true;
            inputs.forEach(input => {
                if (input.value.trim().length === 0) {
                    isValid = false;
                }
            });
            return isValid;
        } else if (type === 'textarea') {
             return true; 
        }
        return true; 
    }

    function showQuestion(id) {
        if (currentQuestionId >= 1 && currentQuestionId <= totalQuestions) {
            saveAnswer(currentQuestionId);
        }

        document.querySelectorAll('.question-card').forEach(card => {
            card.style.display = 'none';
            card.classList.remove('active-question');
        });

        currentQuestionId = id;
        
        const newCard = document.querySelector(`.question-card[data-question-id="${id}"]`);
        if (newCard) {
            newCard.style.display = 'block'; 
            newCard.classList.add('active-question');
            
            updateProgressBar();
            updateNextButtonState(id);
        } else if (id === totalQuestions + 1) {
             document.querySelector('.thank-you-card').style.display = 'block';
             currentQuestionId = totalQuestions; 
             updateProgressBar(); 
        }
    }
    
    function updateNextButtonState(id) {
        const activeCard = document.querySelector(`.question-card[data-question-id="${id}"]`);
        if (!activeCard) return;

        const nextButton = activeCard.querySelector('.next-button:not(.submit-button)');
        const submitButton = activeCard.querySelector('.submit-button');
        
        const isDisabled = !validateQuestion(id);

        if (nextButton) {
             nextButton.disabled = isDisabled;
        }
        
        if (submitButton && id === totalQuestions) {
             submitButton.disabled = false;
        }
    }

    function saveAnswer(id) {
        const questionCard = document.querySelector(`.question-card[data-question-id="${id}"]`);
        if (!questionCard) return;
        
        const type = questionCard.getAttribute('data-type');

        if (type === 'radio') {
            const checkedInput = questionCard.querySelector('input[type="radio"]:checked');
            answers[`q${id}`] = checkedInput ? checkedInput.value : null; 
        } else if (type === 'text' || type === 'textarea') {
             questionCard.querySelectorAll('.text-input-field').forEach(input => {
                 answers[input.id] = input.value;
             });
        }
    }
    
    // =======================================================
    // FUNGSI UNTUK MENAMPILKAN PESAN SUKSES/ERROR
    // =======================================================
    function showSuccessPage() {
        showQuestion(totalQuestions + 1);
        const thankYouCard = document.querySelector('.thank-you-card');
        if (thankYouCard) {
            // Animasi agar pesan sukses terlihat bagus (lebih profesional dari alert)
            thankYouCard.style.opacity = 0;
            thankYouCard.style.transform = 'translateY(20px)';
            setTimeout(() => {
                thankYouCard.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
                thankYouCard.style.opacity = 1;
                thankYouCard.style.transform = 'translateY(0)';
            }, 10);
        }
    }

    function displayError(message) {
        console.error('Submission Error Displayed:', message);
        
        // **PERBAIKAN UX:** MENGHILANGKAN ALERT BAWAAN JELEK
        // Kita gunakan console.error dan ubah tombol submit menjadi merah
        
        const submitButton = document.querySelector('.submit-button');
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = 'Gagal (Coba Lagi) →';
            submitButton.style.backgroundColor = 'red';
        }
        
        // Tampilkan pesan error di konsol untuk debugging
        console.log(`[USER MESSAGE] Gagal Mengirim Data. Detail: ${message}`);
    }


    // =======================================================
    // 4. FUNGSI SUBMIT DATA KE API INTERNAL (PERBAIKAN FINAL ERROR)
    // =======================================================
    function submitSurvey() {
        
        saveAnswer(totalQuestions); 
        answers['submission_time'] = new Date().toISOString();
        
        const submitButton = document.querySelector('.submit-button');
        submitButton.disabled = true;
        submitButton.textContent = 'Mengirim...';
        submitButton.style.backgroundColor = ''; // Reset warna tombol
        
        fetch(API_SUBMIT_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(answers),
        })
        .then(async response => { 
            let data = {};
            
            // Coba baca body sebagai JSON (untuk respons sukses atau error terstruktur)
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.indexOf("application/json") !== -1) {
                try {
                    data = await response.json();
                } catch (e) {
                    // Jika gagal baca JSON (mis. respons error Vercel default HTML)
                    // Baca sebagai teks untuk debugging
                    const errorText = await response.text();
                    throw new Error(`Non-JSON/Server Error. Status: ${response.status}. Pesan: ${errorText.substring(0, 50)}...`);
                }
            } else {
                 // Jika tidak ada JSON (respons Vercel default HTML)
                const errorText = await response.text();
                throw new Error(`Server Error. Status: ${response.status}. Pesan: ${errorText.substring(0, 50)}...`);
            }
            
            // Cek status OK dan data.success
            if (!response.ok) {
                 throw new Error(data.error || `Pengiriman gagal. Status: ${response.status}`);
            }

            if (data.success) { 
                console.log('Submission Berhasil:', data);
                showSuccessPage(); 
            } else {
                 throw new Error(data.message || 'API merespon tidak sukses.');
            }
        })
        .catch((error) => {
            console.error('Submission Error Catch:', error);
            displayError(error.message); 
        });
    }

    // =======================================================
    // 5. EVENT LISTENERS UNTUK NAVIGASI (NEXT/PREV/SUBMIT)
    // =======================================================
    questionSection.addEventListener('click', function(e) {
        let target = e.target;
        
        while (target && !target.classList.contains('nav-button')) {
            target = target.parentElement;
        }
        if (!target) return;

        if (target.classList.contains('next-button')) {
            if (validateQuestion(currentQuestionId) && !target.disabled) {
                
                if (target.classList.contains('submit-button')) {
                    submitSurvey();
                } else {
                    const nextId = currentQuestionId + 1;
                    showQuestion(nextId);
                }
            }
        } else if (target.classList.contains('prev-button')) {
            const prevId = currentQuestionId - 1;
            if (prevId >= 1) {
                showQuestion(prevId);
            }
        }
    });
    
    // =======================================================
    // 6. EVENT LISTENERS UNTUK VALIDASI (INPUT)
    // =======================================================
    questionSection.addEventListener('input', function(e) {
        const target = e.target;
        
        if (target.type === 'radio') {
            document.querySelectorAll(`.question-card[data-question-id="${currentQuestionId}"] .option-card`).forEach(card => {
                card.classList.remove('selected');
            });
            target.parentElement.classList.add('selected');
        }
        
        updateNextButtonState(currentQuestionId);
    });
    
    // Inisialisasi awal UI
    updateProgressBar();
});
