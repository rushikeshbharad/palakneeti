import React, { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { Box, IconButton, Paper, Typography, TextField, Button, Divider } from "@mui/material"
import ARTICLES from "../constants/index";

const setDefaultMessages = () => {
    const msgs = [{ from: 'bot', text: 'Hello! How can I help you find an article today?' }];
    localStorage.setItem("palakneeti-bot-messages", JSON.stringify());
    return msgs
}

const ChatBot = () => {
    const [isOpen, setIsOpen] = useState(false);
    const chatRef = useRef(null);
    const messagesEndRef = useRef(null);
    const [messages, setMessages] = useState(() => {
        try {
            const savedMessages = localStorage.getItem("palakneeti-bot-messages");
            if (!savedMessages) {
                return setDefaultMessages();
            }
            if (!JSON.parse(savedMessages).length) {
                return setDefaultMessages();
            }
            return JSON.parse(savedMessages)
        } catch (error) {
            return setDefaultMessages();
        }
    });
    const [inputValue, setInputValue] = useState('');
    const [isThinking, setIsThinking] = useState(false);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    // Save messages to localStorage whenever they change
    useEffect(() => {
        try {
            localStorage.setItem("palakneeti-bot-messages", JSON.stringify(messages));
        } catch (error) {
            console.error("Could not save messages to localStorage", error);
        }
    }, [messages]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        setTimeout(() => scrollToBottom(), 100)
        function handleClickOutside(event) {
            // Close chat if the click is outside the chat window
            if (chatRef.current && !chatRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }

        if (isOpen) {
            // Add event listener when the chat is open
            document.addEventListener("mousedown", handleClickOutside);
        }

        // Cleanup the event listener on component unmount or when chat is closed
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isOpen]);

    const clearMessages = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const defaultMessages = setDefaultMessages();
        setMessages(defaultMessages);
        setIsThinking(false);
    }

    const handleToggleChat = () => setIsOpen(prev => !prev);

    const getTopLinks = (text) => {
        if (!text || text.trim() === "") {
            return [];
        }
        const searchTerms = text.toLowerCase().split(' ').filter(term => term.trim() !== '');

        if (searchTerms.length === 0) {
            return [];
        }

        const countOccurrences = (source, find) => {
            if (!source) return 0;
            return source.split(find).length - 1;
        };

        const getTextFromHtml = (html) => {
            if (typeof document === 'undefined') return '';
            const div = document.createElement('div');
            div.innerHTML = html;
            return (div.textContent || div.innerText || "").toLowerCase();
        };

        const scoredArticles = ARTICLES.map(articleObject => {
            const [articleKey, articleData] = Object.entries(articleObject)[0];
            let points = 0;

            const title = articleData.title.marathi || articleData.title.english;
            const titleMarathi = (articleData.title.marathi || "").toLowerCase();
            const titleEnglish = (articleData.title.english || "").toLowerCase();
            const tags = (articleData.tags || []).join(" ").toLowerCase();
            const textContentMarathi = getTextFromHtml(articleData.content.marathi || "");
            const textContentEnglish = getTextFromHtml(articleData.content.english || "");

            searchTerms.forEach((term) => {
                points += (countOccurrences(titleMarathi, term) + countOccurrences(titleEnglish, term)) * 5;
                points += countOccurrences(tags, term) * 3;
                points += (countOccurrences(textContentMarathi, term) + countOccurrences(textContentEnglish, term)) * 1;
            });
            return { articleKey, points, title };
        }).filter(article => article.points > 0);

        scoredArticles.sort((a, b) => b.points - a.points);

        return scoredArticles.slice(0, 3);
    };

    const handleSend = async () => {
        const trimmedInput = inputValue.trim();
        if (!trimmedInput) return;

        // Add user message and set thinking state
        setMessages(prev => [...prev, { from: 'user', text: trimmedInput }]);
        setIsThinking(true);
        setInputValue('');

        // Wait for a bit to simulate thinking
        await new Promise(resolve => setTimeout(resolve, 2500));

        const topArticles = getTopLinks(trimmedInput);
        let botResponse;

        if (topArticles.length > 0) {
            botResponse = {
                from: 'bot',
                text: topArticles.length === 1 ? 'Here is an article you might find interesting:' : 'Here are some articles you might find interesting:',
                links: topArticles
            };
        } else {
            botResponse = { from: 'bot', text: "Sorry, I couldn't find any articles matching your search." };
        }

        // Stop thinking and add the bot's response
        setIsThinking(false);
        setMessages(prev => [...prev, botResponse]);
    };

    const TypingIndicator = () => {
        const dotStyle = {
            width: '8px',
            height: '8px',
            margin: '0 2px',
            backgroundColor: '#aaa',
            borderRadius: '50%',
            display: 'inline-block',
            animation: 'typing-bounce 1.2s infinite ease-in-out',
        };

        return (
            <Box sx={{ alignSelf: 'flex-start', p: 1, borderRadius: '10px', backgroundColor: '#f0f0f0' }}>
                <Box sx={{ ...dotStyle, animationDelay: '-0.32s' }} />
                <Box sx={{ ...dotStyle, animationDelay: '-0.16s' }} />
                <Box sx={{ ...dotStyle }} />
            </Box>
        );
    };

    return (
        <Box sx={{ position: 'fixed', bottom: '1em', right: '1em', zIndex: 1000 }}>
            {isOpen && (
                <Paper ref={chatRef} elevation={5} sx={{ width: 350, height: 500, display: 'flex', flexDirection: 'column', borderRadius: '10px' }}>
                    <Box
                        onClick={handleToggleChat}
                        sx={{
                            p: 2,
                            backgroundColor: 'primary.main',
                            color: 'white',
                            borderTopLeftRadius: '10px',
                            borderTopRightRadius: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                        }}
                    >
                        <Typography variant="h6">Palakneeti Bot</Typography>
                        {messages.length > 1 && (
                            <Button
                                sx={{ color: 'white !important', "&:hover": { opacity: 0.7 } }}
                                variant="text"
                                onClick={clearMessages}
                            >
                                Clear
                            </Button>
                        )}
                    </Box>
                    <Box sx={{ flexGrow: 1, p: 2, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {messages.map((msg, index) => (
                            <Box
                                key={index}
                                sx={{
                                    alignSelf: msg.from === 'bot' ? 'flex-start' : 'flex-end',
                                    backgroundColor: msg.from === 'bot' ? '#f0f0f0' : '#1976d2',
                                    p: 1,
                                    borderRadius: '10px',
                                    maxWidth: '80%',
                                }}
                            >
                                <Typography sx={{ color: msg.from === 'bot' ? 'black' : 'white' }}>
                                    {msg.text}
                                </Typography>
                                <Box
                                    sx={{
                                        marginTop: 1,
                                        "& a": {
                                            display: 'inline-block',
                                            margin: '0.5em 1em',
                                            textDecoration: 'none',
                                            '&:hover': { textDecoration: 'underline' }
                                        }
                                    }}
                                >
                                    {msg.links && msg.links.map(article => (
                                        <>
                                            <Divider />
                                            <Link
                                                key={article.articleKey}
                                                to={`/${article.articleKey.split('_').slice(3).join('_')}`}
                                            >
                                                {article.title}
                                            </Link>
                                        </>
                                    ))}
                                </Box>
                            </Box>
                        ))}
                        {isThinking && <TypingIndicator />}
                        <div ref={messagesEndRef} />
                    </Box>
                    <Box sx={{ p: 1, display: 'flex', gap: 1, borderTop: '1px solid #ddd' }}>
                        <TextField fullWidth variant="outlined" size="small" placeholder="Ask about articles..." value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} />
                        <Button variant="contained" onClick={handleSend}>Send</Button>
                    </Box>
                </Paper>
            )}
            {!isOpen && (
                <IconButton
                    onClick={handleToggleChat}
                    sx={{
                        backgroundColor: 'oklch(88.2% 0.059 254.128)',
                        border: '2px solid oklch(50% 0.134 242.749)',
                        '&:hover': {
                            backgroundColor: 'oklch(50% 0.134 242.749)',
                        },
                        padding: '12px',
                        '& img:first-of-type': {
                            display: 'none'
                        },
                        '&:hover img:first-of-type': {
                            display: 'block'
                        },
                        '&:hover img:last-of-type': {
                            display: 'none'
                        }
                    }}
                >
                    <img src="https://cdn.jsdelivr.net/gh/rushikeshbharad/palakneeti@main/assets/icons/chat-bot-light.png" alt="Chat Bot" style={{ width: 32, height: 32 }} />
                    <img src="https://cdn.jsdelivr.net/gh/rushikeshbharad/palakneeti@main/assets/icons/chat-bot.png" alt="Chat Bot" style={{ width: 32, height: 32 }} />
                </IconButton>
            )}
        </Box>
    )
};

export default ChatBot;
