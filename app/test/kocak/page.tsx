'use client'
import { useEffect, useState, useRef } from 'react'
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

export default function TestPage() {
    const [pesan, setPesan] = useState('Standby...')
    const [mcpData, setMcpData] = useState<string>('')
    const [isConnected, setIsConnected] = useState(false)
    const clientRef = useRef<Client | null>(null)
    const { user } = useAuth()

    // useEffect(() => {
    //     // Initialize MCP Client
    //     async function connectMCP() {
    //         try {
    //             setPesan('Menghubungkan ke MCP SSE...');
    //             const transport = new SSEClientTransport(
    //                 new URL("http://localhost:8081/sse")
    //             );

    //             const client = new Client(
    //                 { name: "nextjs-frontend", version: "1.0.0" },
    //                 { capabilities: {} }
    //             );

    //             await client.connect(transport);
    //             clientRef.current = client;
    //             setIsConnected(true);
    //             setPesan('Terhubung ke MCP Server via SSE!');
    //         } catch (err: any) {
    //             console.error("Gagal konek MCP:", err);
    //             setPesan('Gagal terhubung MCP: ' + err.message);
    //         }
    //     }

    //     connectMCP();

    //     return () => {
    //         // Cleanup on unmount
    //         if (clientRef.current) {
    //             // The SDK doesn't have a direct disconnect sometimes, but we can try to close transport
    //             try {
    //                 clientRef.current.close();
    //             } catch (e) {
    //                 console.log("Cleanup MCP client");
    //             }
    //         }
    //     }
    // }, [])

    // SSE Listener for transcription_ready
    useEffect(() => {
        if (!user?.id || !clientRef.current) return;

        const token = localStorage.getItem('auth_token');
        const eventSource = new EventSource(`http://localhost:8081/notifications?userId=${user.id}`);

        eventSource.onmessage = async (event) => {
            try {
                const data = JSON.parse(event.data);

                if (data.event === 'transcription_ready') {
                    console.log('✅ Signal received: transcription_ready for Video ID:', data.video_id);

                    try {
                        setMcpData(`Transcription ready received for video ${data.video_id}. Generating quizzes...`);
                        const result = await clientRef.current!.callTool({
                            name: "generateAdaptiveVideoQuizzes",
                            arguments: {
                                token: token,
                                videoId: data.video_id,
                                intervalMinutes: 3
                            }
                        });

                        console.log('🎉 MCP Tool Finished generating quizzes successfully:', result);

                        // Parse result carefully
                        const contentArray = (result as any).content as Array<{ type: string; text?: string }>;
                        const textContent = contentArray?.find?.(c => c.type === 'text');
                        if (textContent && textContent.text) {
                            setMcpData(`[🎉 Quiz Generation Finished via SSE]:\n\n${textContent.text}`);
                        } else {
                            setMcpData(`[🎉 Quiz Generation Finished via SSE]:\n\n${JSON.stringify(result, null, 2)}`);
                        }
                    } catch (mcpError) {
                        console.error('❌ Error executing MCP tool:', mcpError);
                        setMcpData(`Error executing MCP tool via SSE: ${(mcpError as Error).message}`);
                    }
                }
            } catch (parseError) {
                console.error('❌ Error parsing SSE data:', parseError);
            }
        };

        return () => {
            eventSource.close();
            console.log('🔌 Notification SSE Connection closed');
        };
    }, [user?.id, isConnected]);

    const handleCallMcp = async () => {
        if (!clientRef.current) return;

        const token = localStorage.getItem('auth_token');
        if (!token) {
            setMcpData('Error: Tidak ada token login. Silakan login terlebih dahulu.');
            return;
        }

        try {
            setMcpData('Memanggil tool getCurrentUser...');
            const result = await clientRef.current.callTool({
                name: "getCurrentUser",
                arguments: {
                    token: token
                }
            });

            // result.content is an array of content objects, but the SDK type might be 'unknown'
            const contentArray = (result as any).content as Array<{ type: string; text?: string }>;
            const textContent = contentArray?.find?.(c => c.type === 'text');

            if (textContent && textContent.text) {
                setMcpData(textContent.text);
            } else {
                setMcpData(JSON.stringify(result, null, 2));
            }
        } catch (err: any) {
            setMcpData('Gagal call tool: ' + err.message);
        }
    };

    const handleCallGemini = async () => {
        if (!clientRef.current) return;

        const token = localStorage.getItem('auth_token');
        if (!token) {
            setMcpData('Error: Tidak ada token login. Silakan login terlebih dahulu.');
            return;
        }

        try {
            setMcpData('Memanggil Gemini (analisis audio paths)... Mohon tunggu.');
            const result = await clientRef.current.callTool({
                name: "analyzeVideoAudioPaths",
                arguments: {
                    token: token,
                    prompt: "Coba simpulkan jenis-jenis audio path apa saja yang saya miliki, format dengan rapi."
                }
            });

            const contentArray = (result as any).content as Array<{ type: string; text?: string }>;
            const textContent = contentArray?.find?.(c => c.type === 'text');

            if (textContent && textContent.text) {
                setMcpData(`[Respons Gemini]:\n\n${textContent.text}`);
            } else {
                setMcpData(JSON.stringify(result, null, 2));
            }
        } catch (err: any) {
            setMcpData('Gagal call Gemini: ' + err.message);
        }
    };

    const [videoId, setVideoId] = useState<string>('')
    const [interval, setInterval] = useState<number>(3)

    const handleGenerateQuizzes = async () => {
        if (!clientRef.current) return;
        if (!videoId) {
            setMcpData('Error: Masukkan Video ID terlebih dahulu.');
            return;
        }

        const token = localStorage.getItem('auth_token');
        if (!token) {
            setMcpData('Error: Tidak ada token login. Silakan login terlebih dahulu.');
            return;
        }

        try {
            setMcpData(`Memanggil generateAdaptiveVideoQuizzes untuk Video ID: ${videoId}... Mohon tunggu, ini mungkin memakan waktu lama karena memproses transkripsi.`);

            const result = await clientRef.current.callTool({
                name: "generateAdaptiveVideoQuizzes",
                arguments: {
                    token: token,
                    videoId: videoId,
                    intervalMinutes: Number(interval)
                }
            });

            const contentArray = (result as any).content as Array<{ type: string; text?: string }>;
            const textContent = contentArray?.find?.(c => c.type === 'text');

            if (textContent && textContent.text) {
                setMcpData(`[Respons MCP]:\n\n${textContent.text}`);
            } else {
                setMcpData(JSON.stringify(result, null, 2));
            }
        } catch (err: any) {
            setMcpData('Gagal generate kuis: ' + err.message);
        }
    };

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-6">
            <div className="text-center space-y-4">
                <h1 className="text-2xl font-bold">Test MCP SSE</h1>
                <p className={`font-medium ${pesan.includes('Gagal') ? 'text-red-500' : 'text-green-500'}`}>
                    {pesan}
                </p>

                <div className="flex gap-4 justify-center mt-4 border-b pb-6">
                    <Button
                        onClick={handleCallMcp}
                        disabled={!isConnected}
                        variant="outline"
                    >
                        Get Logged In User
                    </Button>
                    <Button
                        onClick={handleCallGemini}
                        disabled={!isConnected}
                        variant="secondary"
                    >
                        Analyze Audio Paths
                    </Button>
                </div>

                <div className="bg-card border p-6 rounded-xl shadow-sm space-y-4">
                    <h2 className="font-semibold text-lg">Generate Adaptive Quizzes</h2>
                    <div className="flex flex-col sm:flex-row gap-4 items-end justify-center">
                        <div className="space-y-1 text-left">
                            <label className="text-xs font-medium px-1">Video ID (UUID/ID)</label>
                            <input
                                type="text"
                                value={videoId}
                                onChange={(e) => setVideoId(e.target.value)}
                                placeholder="Masukkan Video ID..."
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            />
                        </div>
                        <div className="space-y-1 text-left w-24">
                            <label className="text-xs font-medium px-1">Menit</label>
                            <input
                                type="number"
                                value={interval}
                                onChange={(e) => setInterval(Number(e.target.value))}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            />
                        </div>
                        <Button
                            onClick={handleGenerateQuizzes}
                            disabled={!isConnected}
                            className="bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                            Generate Quizzes via MCP
                        </Button>
                    </div>
                    <p className="text-xs text-muted-foreground italic">
                        Tool ini akan mengambil transkripsi dari backend, memecahnya per {interval} menit, dan membuat soal via Gemini.
                    </p>
                </div>
            </div>

            {mcpData && (
                <div className="bg-muted p-4 rounded-lg border overflow-auto min-h-[100px]">
                    <h2 className="text-sm font-semibold mb-2 flex justify-between items-center">
                        <span>Respons Tool MCP:</span>
                        <Button variant="ghost" size="sm" onClick={() => setMcpData('')} className="h-6 text-xs">Clear</Button>
                    </h2>
                    <pre className="text-sm whitespace-pre-wrap font-mono">
                        {mcpData}
                    </pre>
                </div>
            )}
        </div>
    )
}