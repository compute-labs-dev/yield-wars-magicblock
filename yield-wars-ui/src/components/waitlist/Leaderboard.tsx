"use client";

import { useState, useEffect, useCallback } from "react";
import {
	ChevronLeft,
	ChevronRight,
	Trophy,
	Loader2,
	AlertCircle,
	RefreshCw,
	Award,
	Info,
	BarChart,
} from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useSoar, LeaderboardEntry } from "@/hooks/useSoar";
import { useAchievements } from "@/hooks/useAchievements";
import { toast } from "sonner";
import WalletButton from "@/components/ui/WalletButton";
import { formatAddress } from "@/lib/formatters";
import { PublicKey } from "@solana/web3.js";

// Default values for pagination
const DEFAULT_PAGE = 1;

// SOAR configuration values
const SOAR_CONFIG = {
	soarProgramId: "SoarNNzwQHMwcfdkdLc6kvbkoMSxcHy89gTHrjhJYkk",
	gameAddress: "4mXenhrhJ3ShRUgYP5qNfTcpsWGNDvNScEBS6Fuq9AGU",
	leaderboardAddress: "8huPFWRtuCJ2ByDnaLKp5pY9mdoe3DCgTQistq4uYAXT",
	topEntriesAddress: "G8HGX9GtApe5T2AJmEqeh6mFUeLaPpqtB4RbCAzvmgPQ",
};

// Type definitions for game and leaderboard metadata
interface GameInfo {
	title: string;
	description: string;
	genre: string;
	gameType: string;
	achievementCount: string;
	leaderboardCount: string;
	authorities: string[];
}

interface LeaderboardInfo {
	description: string;
	decimals: number;
	minScore: string;
	maxScore: string;
	allowMultipleScores: boolean;
}

/**
 * Cyberpunk-themed Leaderboard Component
 * Displays the global leaderboard with SOAR integration
 */
export default function Leaderboard() {
	// Wallet and SOAR connection
	const { publicKey, connected } = useWallet();
	const {
		playerRank,
		playerScore,
		isLoading: soarLoading,
		error: soarError,
		fetchLeaderboard,
		getPlayerInfo,
		initializePlayer,
		registerWithLeaderboard,
		submitScore,
		soarProgram,
		gameClient,
	} = useSoar();

	const {
		achievements,
		isLoading: achievementsLoading,
		unlockAchievement,
	} = useAchievements();

	// State for pagination
	const [currentPage, setCurrentPage] = useState(DEFAULT_PAGE);
	const entriesPerPage = 20; // Modified to show 20 entries per page (10 per column)
	const [totalPages, setTotalPages] = useState(1);
	const [displayEntries, setDisplayEntries] = useState<LeaderboardEntry[]>(
		[]
	);

	// Top all-time leaders
	const [topAllTimeLeaders, setTopAllTimeLeaders] = useState<
		LeaderboardEntry[]
	>([]);

	// Show achievements panel
	const [showAchievements, setShowAchievements] = useState(false);

	// Show game info panel
	const [showGameInfo, setShowGameInfo] = useState(false);

	// Game and leaderboard metadata
	const [gameInfo, setGameInfo] = useState<GameInfo | null>(null);
	const [leaderboardInfo, setLeaderboardInfo] =
		useState<LeaderboardInfo | null>(null);
	const [loadingMetadata, setLoadingMetadata] = useState(false);

	// Inside the Leaderboard component, add these state variables for tracking individual loading states
	const [initializingPlayer, setInitializingPlayer] = useState(false);
	const [registeringWithLeaderboard, setRegisteringWithLeaderboard] =
		useState(false);
	const [submittingScore, setSubmittingScore] = useState(false);
	const [operationError, setOperationError] = useState<string | null>(null);

	// Function to fetch game and leaderboard metadata
	const fetchGameMetadata = useCallback(async () => {
		if (!soarProgram || !gameClient) return;

		setLoadingMetadata(true);
		try {
			// Load game information
			try {
				const gameAddress = new PublicKey(SOAR_CONFIG.gameAddress);
				const gameAccount = await soarProgram.fetchGameAccount(
					gameAddress
				);

				if (gameAccount) {
					setGameInfo({
						title: gameAccount.meta.title,
						description: gameAccount.meta.description,
						genre: gameAccount.meta.genre.toString(),
						gameType: gameAccount.meta.gameType.toString(),
						achievementCount:
							gameAccount.achievementCount.toString(),
						leaderboardCount:
							gameAccount.leaderboardCount.toString(),
						authorities: gameAccount.auth.map((auth: PublicKey) =>
							auth.toString()
						),
					});
				}
			} catch (error) {
				console.error("Error fetching game account:", error);
			}

			// Load leaderboard information from the provided address
			try {
				const leaderboardPubkey = new PublicKey(
					SOAR_CONFIG.leaderboardAddress
				);
				const leaderboardAccount =
					await soarProgram.fetchLeaderBoardAccount(
						leaderboardPubkey
					);

				if (leaderboardAccount) {
					setLeaderboardInfo({
						description: leaderboardAccount.description,
						decimals: leaderboardAccount.decimals,
						minScore: leaderboardAccount.minScore.toString(),
						maxScore: leaderboardAccount.maxScore.toString(),
						allowMultipleScores:
							leaderboardAccount.allowMultipleScores,
					});
				}
			} catch (error) {
				console.error("Error fetching leaderboard metadata:", error);
			}

			// Load top entries if available
			try {
				const topEntriesPubkey = new PublicKey(
					SOAR_CONFIG.topEntriesAddress
				);
				const topEntriesAccount =
					await soarProgram.fetchLeaderBoardTopEntriesAccount(
						topEntriesPubkey
					);

				if (topEntriesAccount) {
					console.log(
						"Top entries loaded:",
						topEntriesAccount.topScores.length
					);
				}
			} catch (error) {
				console.error("Error fetching top entries:", error);
			}
		} catch (error) {
			console.error("Error fetching game metadata:", error);
		} finally {
			setLoadingMetadata(false);
		}
	}, [soarProgram, gameClient]);

	// Function to fetch and format leaderboard data
	const loadLeaderboardData = useCallback(async () => {
		try {
			// Fetch leaderboard data
			const entries = await fetchLeaderboard(100); // Get a larger set to support pagination
			console.log("Raw leaderboard entries received:", entries);

			if (entries && entries.length > 0) {
				// Set top 3 all-time leaders
				setTopAllTimeLeaders(entries.slice(0, 3));

				// Calculate total pages (20 entries per page now - 10 per column)
				const totalPgs = Math.ceil(entries.length / entriesPerPage);
				setTotalPages(totalPgs);

				// Get current page of entries
				const startIndex = (currentPage - 1) * entriesPerPage;
				const endIndex = startIndex + entriesPerPage;
				const currentEntries = entries.slice(startIndex, endIndex);

				console.log(
					`Displaying page ${currentPage} of ${totalPgs}, showing entries ${
						startIndex + 1
					}-${endIndex} of ${entries.length}`
				);
				console.log("Current page entries:", currentEntries);

				setDisplayEntries(currentEntries);
			} else {
				console.log("No entries returned from fetchLeaderboard");
				setDisplayEntries([]);
				setTopAllTimeLeaders([]);
				setTotalPages(1);
			}
		} catch (error) {
			console.error("Error loading leaderboard data:", error);
			setDisplayEntries([]);
			setTopAllTimeLeaders([]);
			setTotalPages(1);
		}
	}, [fetchLeaderboard, currentPage, entriesPerPage]);

	// Load leaderboard data and metadata on component mount
	useEffect(() => {
		loadLeaderboardData();
	}, [loadLeaderboardData]);

	useEffect(() => {
		if (soarProgram && gameClient) {
			fetchGameMetadata();
		}
	}, [soarProgram, gameClient, fetchGameMetadata]);

	// Function to handle page changes
	const changePage = (newPage: number) => {
		if (newPage < 1 || newPage > totalPages) return;
		setCurrentPage(newPage);
	};

	// Replace the handleInitializePlayer function with this:
	const handleInitializePlayer = async () => {
		if (!connected) {
			toast.error("Please connect your wallet first");
			return;
		}

		setInitializingPlayer(true);
		setOperationError(null);

		try {
			const success = await initializePlayer();
			if (success) {
				setOperationError(null);
			}
		} catch (error) {
			console.error("Error initializing player:", error);
			setOperationError(
				"Failed to initialize player. See console for details."
			);
		} finally {
			setInitializingPlayer(false);
		}
	};

	// Replace the handleRegisterWithLeaderboard function with this:
	const handleRegisterWithLeaderboard = async () => {
		if (!connected) {
			toast.error("Please connect your wallet first");
			return;
		}

		setRegisteringWithLeaderboard(true);
		setOperationError(null);

		try {
			const success = await registerWithLeaderboard();
			if (success) {
				setOperationError(null);
			}
		} catch (error) {
			console.error("Error registering with leaderboard:", error);
			setOperationError(
				"Failed to register with leaderboard. See console for details."
			);
		} finally {
			setRegisteringWithLeaderboard(false);
		}
	};

	// Replace the handleSubmitScore function with this:
	const handleSubmitScore = async () => {
		if (!connected) {
			toast.error("Please connect your wallet first");
			return;
		}

		setSubmittingScore(true);
		setOperationError(null);

		try {
			// For demo, submit a random score between 100-1000
			const demoScore = Math.floor(Math.random() * 900) + 100;
			const success = await submitScore(demoScore);

			if (success) {
				// Refresh player info and leaderboard
				await getPlayerInfo();
				await loadLeaderboardData();

				// Check if we should unlock an achievement
				if (demoScore > 500) {
					unlockAchievement("first_trade");
				}
				if (demoScore > 900) {
					unlockAchievement("millionaire");
				}

				setOperationError(null);
			}
		} catch (error) {
			console.error("Error submitting score:", error);
			setOperationError(
				"Failed to submit score. See console for details."
			);
		} finally {
			setSubmittingScore(false);
		}
	};

	// Toggle achievements panel
	const toggleAchievements = () => {
		setShowAchievements(!showAchievements);
	};

	// Toggle game info panel
	const toggleGameInfo = () => {
		setShowGameInfo(!showGameInfo);
	};

	return (
		<div className="w-full max-w-5xl mx-auto p-4 font-mono">
			<div className="mb-6">
				<h2 className="text-6xl mb-6 text-center bg-gradient-to-r from-[##6ED62D] to-[##6ED62D] bg-clip-text animate-gradient-flow text-[#6ED62D]">
					LEADERBOARD
				</h2>

				<div className="flex justify-center mb-8">
					<WalletButton />
				</div>

				{/* Player Stats and Actions */}
				{connected ? (
					<>
						{/* Game Info Panel */}
						<button
							onClick={toggleGameInfo}
							className="mb-4 flex items-center gap-2 bg-[#1a4d1a] hover:bg-[#143914] text-white px-3 py-2 rounded-md text-sm transition-colors mx-auto"
						>
							<Info size={16} />
							{showGameInfo ? "Hide Game Info" : "Show Game Info"}
						</button>

						{showGameInfo && (
							<div className="mb-8 p-4 bg-black/50 border border-[#b6f0b6]/30 rounded-lg">
								<h3 className="text-[#e1f8d8] font-bold text-lg mb-3 flex items-center">
									<BarChart size={18} className="mr-2" />
									SOAR Game Information
								</h3>

								<div className="mb-3 bg-black/30 p-3 rounded-md">
									<p className="text-sm text-[#b6f0b6]">
										Game Address: {SOAR_CONFIG.gameAddress}
									</p>
									<p className="text-sm text-[#b6f0b6] mt-1">
										Leaderboard Address:{" "}
										{SOAR_CONFIG.leaderboardAddress}
									</p>
									<p className="text-sm text-[#b6f0b6] mt-1">
										SOAR Program ID:{" "}
										{SOAR_CONFIG.soarProgramId}
									</p>
								</div>

								{loadingMetadata ? (
									<div className="flex justify-center items-center py-4">
										<Loader2
											size={24}
											className="animate-spin mr-2"
										/>
										<span className="text-[#DDE0E3]">
											Loading game information...
										</span>
									</div>
								) : (
									<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
										<div className="bg-black/30 p-4 rounded-lg border border-[#b6f0b6]/20">
											<h4 className="text-[#e1f8d8] font-bold mb-2">
												Game Data
											</h4>
											{gameInfo ? (
												<div className="space-y-2">
													<p className="text-sm text-[#dde0e3]">
														<span className="text-[#b6f0b6]">
															Title:
														</span>{" "}
														{gameInfo.title}
													</p>
													<p className="text-sm text-[#dde0e3]">
														<span className="text-[#b6f0b6]">
															Description:
														</span>{" "}
														{gameInfo.description}
													</p>
													<p className="text-sm text-[#dde0e3]">
														<span className="text-[#b6f0b6]">
															Genre:
														</span>{" "}
														{gameInfo.genre}
													</p>
													<p className="text-sm text-[#dde0e3]">
														<span className="text-[#b6f0b6]">
															Type:
														</span>{" "}
														{gameInfo.gameType}
													</p>
													<p className="text-sm text-[#dde0e3]">
														<span className="text-[#b6f0b6]">
															Achievements:
														</span>{" "}
														{
															gameInfo.achievementCount
														}
													</p>
													<p className="text-sm text-[#dde0e3]">
														<span className="text-[#b6f0b6]">
															Leaderboards:
														</span>{" "}
														{
															gameInfo.leaderboardCount
														}
													</p>
												</div>
											) : (
												<p className="text-[#DDE0E3] text-sm">
													No game data available
												</p>
											)}
										</div>

										<div className="bg-black/30 p-4 rounded-lg border border-[#b6f0b6]/20">
											<h4 className="text-[#e1f8d8] font-bold mb-2">
												Leaderboard Settings
											</h4>
											{leaderboardInfo ? (
												<div className="space-y-2">
													<p className="text-sm text-[#dde0e3]">
														<span className="text-[#b6f0b6]">
															Description:
														</span>{" "}
														{
															leaderboardInfo.description
														}
													</p>
													<p className="text-sm text-[#dde0e3]">
														<span className="text-[#b6f0b6]">
															Min Score:
														</span>{" "}
														{
															leaderboardInfo.minScore
														}
													</p>
													<p className="text-sm text-[#dde0e3]">
														<span className="text-[#b6f0b6]">
															Max Score:
														</span>{" "}
														{
															leaderboardInfo.maxScore
														}
													</p>
													<p className="text-sm text-[#dde0e3]">
														<span className="text-[#b6f0b6]">
															Decimals:
														</span>{" "}
														{
															leaderboardInfo.decimals
														}
													</p>
													<p className="text-sm text-[#dde0e3]">
														<span className="text-[#b6f0b6]">
															Multiple Scores:
														</span>
														{leaderboardInfo.allowMultipleScores
															? " Allowed"
															: " Not Allowed"}
													</p>
												</div>
											) : (
												<p className="text-[#DDE0E3] text-sm">
													No leaderboard data
													available
												</p>
											)}
										</div>
									</div>
								)}
							</div>
						)}

						<div className="mb-8 p-4 bg-black/50 border border-[#b6f0b6]/30 rounded-lg">
							<div className="flex flex-col sm:flex-row justify-between items-center mb-4">
								<div className="mb-4 sm:mb-0">
									<h3 className="text-[#e1f8d8] font-bold">
										Your Stats
									</h3>
									<p className="text-sm text-[#DDE0E3]">
										Wallet:{" "}
										{formatAddress(
											publicKey?.toString() || ""
										)}
									</p>
									<div className="flex items-center mt-2">
										<p className="text-sm text-[#DDE0E3] mr-4">
											Rank:{" "}
											{playerRank
												? `#${playerRank}`
												: "Not Ranked"}
										</p>
										<p className="text-sm text-[#DDE0E3]">
											Score:{" "}
											{playerScore
												? playerScore.toLocaleString()
												: "0"}
										</p>
									</div>
								</div>
								<div className="flex flex-wrap gap-2">
									<button
										onClick={handleInitializePlayer}
										className="bg-[#1a4d1a] hover:bg-[#143914] text-white px-3 py-2 rounded-md text-sm transition-colors"
										disabled={initializingPlayer}
									>
										{initializingPlayer ? (
											<Loader2
												className="animate-spin mr-1 inline"
												size={14}
											/>
										) : null}
										Initialize Player
									</button>
									<button
										onClick={handleRegisterWithLeaderboard}
										className="bg-[#1a4d1a] hover:bg-[#143914] text-white px-3 py-2 rounded-md text-sm transition-colors"
										disabled={registeringWithLeaderboard}
									>
										{registeringWithLeaderboard ? (
											<Loader2
												className="animate-spin mr-1 inline"
												size={14}
											/>
										) : null}
										Register w/ Leaderboard
									</button>
									<button
										onClick={handleSubmitScore}
										className="bg-[#1a4d1a] hover:bg-[#143914] text-white px-3 py-2 rounded-md text-sm transition-colors"
										disabled={submittingScore}
									>
										{submittingScore ? (
											<Loader2
												className="animate-spin mr-1 inline"
												size={14}
											/>
										) : null}
										Submit Score
									</button>
									<button
										onClick={toggleAchievements}
										className="bg-[#1a4d1a] hover:bg-[#143914] text-white px-3 py-2 rounded-md text-sm transition-colors flex items-center"
									>
										<Award size={14} className="mr-1" />
										{showAchievements
											? "Hide Achievements"
											: "Show Achievements"}
									</button>
								</div>
							</div>

							{/* Error message display */}
							{operationError && (
								<div className="mt-3 p-2 bg-red-900/40 border border-red-500/30 rounded text-sm text-red-200">
									<AlertCircle
										size={14}
										className="inline mr-1"
									/>
									{operationError}
								</div>
							)}

							{/* Achievements Panel */}
							{showAchievements && (
								<div className="mt-4 border-t border-[#b6f0b6]/30 pt-4">
									<h4 className="text-[#e1f8d8] font-bold mb-3">
										Your Achievements
									</h4>
									<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
										{achievementsLoading ? (
											<div className="col-span-full flex justify-center p-4">
												<Loader2
													className="animate-spin mr-2"
													size={18}
												/>
												<span>
													Loading achievements...
												</span>
											</div>
										) : achievements.length > 0 ? (
											achievements.map((achievement) => (
												<div
													key={achievement.id}
													className={`p-3 rounded-md ${
														achievement.unlocked
															? "bg-[#1a4d1a]/50"
															: "bg-black/30"
													} border ${
														achievement.unlocked
															? "border-[#b6f0b6]"
															: "border-[#333438]"
													}`}
												>
													<div className="flex items-start">
														<Award
															size={20}
															className={`mr-2 flex-shrink-0 ${
																achievement.unlocked
																	? "text-[#fbbf24]"
																	: "text-[#DDE0E3]/50"
															}`}
														/>
														<div>
															<h5
																className={`font-bold ${
																	achievement.unlocked
																		? "text-[#e1f8d8]"
																		: "text-[#DDE0E3]/70"
																}`}
															>
																{
																	achievement.title
																}
															</h5>
															<p className="text-xs text-[#DDE0E3]/70">
																{
																	achievement.description
																}
															</p>
															<div className="flex justify-between items-center mt-2">
																<span className="text-xs bg-black/30 px-2 py-1 rounded text-[#DDE0E3]">
																	{
																		achievement.points
																	}{" "}
																	pts
																</span>
																{achievement.unlocked && (
																	<span className="text-xs text-[#b6f0b6]">
																		Unlocked
																	</span>
																)}
															</div>
														</div>
													</div>
												</div>
											))
										) : (
											<div className="col-span-full text-center p-4 text-[#DDE0E3]">
												No achievements available
											</div>
										)}
									</div>
								</div>
							)}
						</div>

						{/* ALL TIME Top 3 Players */}
						<div className="mb-8">
							<h3 className="text-2xl font-bold text-center text-[#e1f8d8] mb-4 border-b border-[#b6f0b6]/30 pb-2">
								ALL TIME LEADERS
							</h3>

							<div className="overflow-hidden rounded-lg border border-[#b6f0b6] bg-black/20">
								<div className="overflow-x-auto">
									<table className="w-full text-sm">
										<thead className="bg-black/50">
											<tr>
												<th className="px-4 py-3 text-left text-xs font-medium text-[#e1f8d8] uppercase tracking-wider">
													Rank
												</th>
												<th className="px-4 py-3 text-left text-xs font-medium text-[#e1f8d8] uppercase tracking-wider">
													Wallet
												</th>
												<th className="px-4 py-3 text-right text-xs font-medium text-[#e1f8d8] uppercase tracking-wider">
													Score
												</th>
											</tr>
										</thead>
										<tbody className="divide-y divide-[#333438]">
											{soarLoading &&
											topAllTimeLeaders.length === 0 ? (
												<tr>
													<td
														colSpan={3}
														className="px-4 py-4 text-center"
													>
														<Loader2
															className="animate-spin mx-auto mb-2"
															size={24}
														/>
														<p className="text-[#DDE0E3]">
															Loading top
															players...
														</p>
													</td>
												</tr>
											) : topAllTimeLeaders.length ===
											  0 ? (
												<tr>
													<td
														colSpan={3}
														className="px-4 py-4 text-center"
													>
														<p className="text-[#DDE0E3]">
															No entries available
														</p>
													</td>
												</tr>
											) : (
												topAllTimeLeaders.map(
													(entry, index) => (
														<tr
															key={`top-${index}`}
															className={`
                          ${index % 2 === 0 ? "bg-black/30" : "bg-black/10"}
                          border-l-4
                          ${
								index === 0
									? "border-[#fbbf24]"
									: index === 1
									? "border-[#d1d5db]"
									: "border-[#b45309]"
							}
                          hover:bg-[#143914]/20 transition-colors
                          ${
								publicKey &&
								entry.wallet === publicKey.toString()
									? "bg-[#1a4d1a]/20"
									: ""
							}
                        `}
														>
															<td className="px-4 py-3 whitespace-nowrap">
																<div className="flex items-center">
																	<Trophy
																		size={
																			20
																		}
																		className={`mr-2 ${
																			index ===
																			0
																				? "text-[#fbbf24]"
																				: index ===
																				  1
																				? "text-[#d1d5db]"
																				: "text-[#b45309]"
																		}`}
																	/>
																	<span className="text-[#e1f8d8] font-bold">
																		{
																			entry.rank
																		}
																	</span>
																</div>
															</td>
															<td className="px-4 py-3 whitespace-nowrap text-[#e1f8d8] font-bold">
																{formatAddress(
																	entry.wallet
																)}
																{publicKey &&
																	entry.wallet ===
																		publicKey.toString() && (
																		<span className="ml-2 bg-[#1a4d1a] text-white text-xs px-2 py-0.5 rounded">
																			You
																		</span>
																	)}
															</td>
															<td className="px-4 py-3 whitespace-nowrap text-right">
																<span className="bg-black/30 px-2 py-1 rounded text-[#e1f8d8] font-bold">
																	{entry.score.toLocaleString()}
																</span>
															</td>
														</tr>
													)
												)
											)}
										</tbody>
									</table>
								</div>
							</div>
						</div>

						{/* Leaderboard Table - Two Column Layout */}
						<h3 className="text-2xl font-bold text-center text-[#e1f8d8] mb-4 border-b border-[#b6f0b6]/30 pb-2">
							CURRENT RANKINGS
						</h3>

						{soarLoading && displayEntries.length === 0 ? (
							<div className="flex justify-center items-center p-10 border border-[#b6f0b6] rounded-lg bg-black/20">
								<Loader2
									className="animate-spin mx-auto mb-2"
									size={32}
								/>
								<p className="text-[#DDE0E3] ml-3">
									Loading leaderboard data...
								</p>
							</div>
						) : !displayEntries || displayEntries.length === 0 ? (
							<div className="flex flex-col items-center p-10 border border-[#b6f0b6] rounded-lg bg-black/20">
								<p className="text-[#DDE0E3] mb-2">
									No entries available
								</p>
								{soarError && (
									<div className="mt-2 p-2 bg-red-900/30 border border-red-500/30 rounded text-sm text-red-200 max-w-xs">
										<AlertCircle
											size={14}
											className="inline mr-1"
										/>
										{soarError}
									</div>
								)}
								<button
									onClick={loadLeaderboardData}
									className="mt-4 flex items-center text-[#DDE0E3] hover:text-white bg-[#1a4d1a]/50 px-3 py-1 rounded-md"
								>
									<RefreshCw size={14} className="mr-1" />{" "}
									Refresh Data
								</button>
							</div>
						) : (
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
								{/* First Column - First 10 entries */}
								<div className="overflow-hidden rounded-lg border border-[#b6f0b6]">
									<div className="overflow-x-auto">
										<table className="w-full text-sm">
											<thead className="bg-black/50">
												<tr>
													<th className="px-4 py-3 text-left text-xs font-medium text-[#e1f8d8] uppercase tracking-wider">
														Rank
													</th>
													<th className="px-4 py-3 text-left text-xs font-medium text-[#e1f8d8] uppercase tracking-wider">
														Wallet
													</th>
													<th className="px-4 py-3 text-right text-xs font-medium text-[#e1f8d8] uppercase tracking-wider">
														Score
													</th>
												</tr>
											</thead>
											<tbody className="divide-y divide-[#333438]">
												{displayEntries
													.slice(0, 10)
													.map((entry, index) => (
														<tr
															key={`col1-${index}`}
															className={`
                          ${index % 2 === 0 ? "bg-black/30" : "bg-black/10"}
                          ${entry.rank <= 3 ? "border-l-4" : ""}
                          ${
								entry.rank === 1
									? "border-[#fbbf24]"
									: entry.rank === 2
									? "border-[#d1d5db]"
									: entry.rank === 3
									? "border-[#b45309]"
									: ""
							}
                          hover:bg-[#143914]/20 transition-colors
                          ${
								publicKey &&
								entry.wallet === publicKey.toString()
									? "bg-[#1a4d1a]/20"
									: ""
							}
                        `}
														>
															<td className="px-4 py-3 whitespace-nowrap">
																<div className="flex items-center">
																	{entry.rank <=
																		3 && (
																		<Trophy
																			size={
																				16
																			}
																			className={`mr-2 ${
																				entry.rank ===
																				1
																					? "text-[#fbbf24]"
																					: entry.rank ===
																					  2
																					? "text-[#d1d5db]"
																					: "text-[#b45309]"
																			}`}
																		/>
																	)}
																	<span
																		className={`text-[#e1f8d8] ${
																			entry.rank <=
																			3
																				? "font-bold"
																				: ""
																		}`}
																	>
																		{
																			entry.rank
																		}
																	</span>
																</div>
															</td>
															<td className="px-4 py-3 whitespace-nowrap text-[#e1f8d8]">
																{formatAddress(
																	entry.wallet
																)}
																{publicKey &&
																	entry.wallet ===
																		publicKey.toString() && (
																		<span className="ml-2 bg-[#1a4d1a] text-white text-xs px-2 py-0.5 rounded">
																			You
																		</span>
																	)}
															</td>
															<td className="px-4 py-3 whitespace-nowrap text-right font-medium">
																<span className="bg-black/30 px-2 py-1 rounded text-[#e1f8d8]">
																	{entry.score.toLocaleString()}
																</span>
															</td>
														</tr>
													))}
											</tbody>
										</table>
									</div>
								</div>

								{/* Second Column - Next 10 entries */}
								<div className="overflow-hidden rounded-lg border border-[#b6f0b6]">
									<div className="overflow-x-auto">
										<table className="w-full text-sm">
											<thead className="bg-black/50">
												<tr>
													<th className="px-4 py-3 text-left text-xs font-medium text-[#e1f8d8] uppercase tracking-wider">
														Rank
													</th>
													<th className="px-4 py-3 text-left text-xs font-medium text-[#e1f8d8] uppercase tracking-wider">
														Wallet
													</th>
													<th className="px-4 py-3 text-right text-xs font-medium text-[#e1f8d8] uppercase tracking-wider">
														Score
													</th>
												</tr>
											</thead>
											<tbody className="divide-y divide-[#333438]">
												{displayEntries
													.slice(10, 20)
													.map((entry, index) => (
														<tr
															key={`col2-${index}`}
															className={`
                          ${index % 2 === 0 ? "bg-black/30" : "bg-black/10"}
                          ${entry.rank <= 3 ? "border-l-4" : ""}
                          ${
								entry.rank === 1
									? "border-[#fbbf24]"
									: entry.rank === 2
									? "border-[#d1d5db]"
									: entry.rank === 3
									? "border-[#b45309]"
									: ""
							}
                          hover:bg-[#143914]/20 transition-colors
                          ${
								publicKey &&
								entry.wallet === publicKey.toString()
									? "bg-[#1a4d1a]/20"
									: ""
							}
                        `}
														>
															<td className="px-4 py-3 whitespace-nowrap">
																<div className="flex items-center">
																	{entry.rank <=
																		3 && (
																		<Trophy
																			size={
																				16
																			}
																			className={`mr-2 ${
																				entry.rank ===
																				1
																					? "text-[#fbbf24]"
																					: entry.rank ===
																					  2
																					? "text-[#d1d5db]"
																					: "text-[#b45309]"
																			}`}
																		/>
																	)}
																	<span
																		className={`text-[#e1f8d8] ${
																			entry.rank <=
																			3
																				? "font-bold"
																				: ""
																		}`}
																	>
																		{
																			entry.rank
																		}
																	</span>
																</div>
															</td>
															<td className="px-4 py-3 whitespace-nowrap text-[#e1f8d8]">
																{formatAddress(
																	entry.wallet
																)}
																{publicKey &&
																	entry.wallet ===
																		publicKey.toString() && (
																		<span className="ml-2 bg-[#1a4d1a] text-white text-xs px-2 py-0.5 rounded">
																			You
																		</span>
																	)}
															</td>
															<td className="px-4 py-3 whitespace-nowrap text-right font-medium">
																<span className="bg-black/30 px-2 py-1 rounded text-[#e1f8d8]">
																	{entry.score.toLocaleString()}
																</span>
															</td>
														</tr>
													))}
											</tbody>
										</table>
									</div>
								</div>
							</div>
						)}

						{/* Pagination */}
						<div className="bg-black/30 px-6 py-4 flex items-center justify-between border border-[#b6f0b6]/40 rounded-lg shadow-lg shadow-[#1a4d1a]/10">
							{/* Mobile pagination */}
							<div className="flex-1 flex justify-between sm:hidden">
								<button
									onClick={() => changePage(currentPage - 1)}
									disabled={currentPage === 1 || soarLoading}
									className={`relative inline-flex items-center px-4 py-2 border ${
										currentPage === 1 || soarLoading
											? "border-[#333438] bg-black/50 text-[#666] cursor-not-allowed"
											: "border-[#1a4d1a] bg-black/80 text-[#b6f0b6] hover:bg-[#1a4d1a]/20 hover:border-[#b6f0b6] hover:text-[#e1f8d8] transition-all"
									} text-sm font-medium rounded-md`}
								>
									<ChevronLeft className="h-4 w-4 mr-1" />
									Previous
								</button>
								<button
									onClick={() => changePage(currentPage + 1)}
									disabled={
										currentPage === totalPages ||
										soarLoading
									}
									className={`ml-3 relative inline-flex items-center px-4 py-2 border ${
										currentPage === totalPages ||
										soarLoading
											? "border-[#333438] bg-black/50 text-[#666] cursor-not-allowed"
											: "border-[#1a4d1a] bg-black/80 text-[#b6f0b6] hover:bg-[#1a4d1a]/20 hover:border-[#b6f0b6] hover:text-[#e1f8d8] transition-all"
									} text-sm font-medium rounded-md`}
								>
									Next
									<ChevronRight className="h-4 w-4 ml-1" />
								</button>
							</div>

							{/* Desktop pagination */}
							<div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
								<div>
									<p className="text-sm text-[#b6f0b6]">
										Page{" "}
										<span className="font-bold text-[#e1f8d8] bg-[#1a4d1a]/30 px-2 py-1 rounded">
											{currentPage}
										</span>{" "}
										of{" "}
										<span className="font-medium text-[#e1f8d8]">
											{totalPages}
										</span>
									</p>
								</div>
								<div>
									<nav
										className="relative z-0 inline-flex rounded-md shadow-[0_0_10px_rgba(106,240,106,0.1)]"
										aria-label="Pagination"
									>
										<button
											onClick={() =>
												changePage(currentPage - 1)
											}
											disabled={
												currentPage === 1 || soarLoading
											}
											className={`relative inline-flex items-center px-3 py-2 rounded-l-md border-y border-l ${
												currentPage === 1 || soarLoading
													? "border-[#333438] bg-black/50 text-[#666] cursor-not-allowed"
													: "border-[#1a4d1a] bg-black/80 text-[#b6f0b6] hover:bg-[#1a4d1a]/20 hover:border-[#b6f0b6] hover:text-[#e1f8d8] transition-all"
											}`}
										>
											<span className="sr-only">
												Previous
											</span>
											<ChevronLeft
												className="h-5 w-5"
												aria-hidden="true"
											/>
										</button>

										{/* Page numbers */}
										{Array.from(
											{ length: Math.min(5, totalPages) },
											(_, i) => {
												let pageNum: number;
												if (totalPages <= 5) {
													pageNum = i + 1;
												} else if (currentPage <= 3) {
													pageNum = i + 1;
												} else if (
													currentPage >=
													totalPages - 2
												) {
													pageNum =
														totalPages - 4 + i;
												} else {
													pageNum =
														currentPage - 2 + i;
												}

												if (
													pageNum > 0 &&
													pageNum <= totalPages
												) {
													return (
														<button
															key={pageNum}
															onClick={() =>
																changePage(
																	pageNum
																)
															}
															disabled={
																soarLoading
															}
															aria-current={
																currentPage ===
																pageNum
																	? "page"
																	: undefined
															}
															className={`relative inline-flex items-center px-4 py-2 border-y ${
																pageNum !==
																totalPages
																	? "border-r"
																	: ""
															} text-sm font-medium ${
																currentPage ===
																pageNum
																	? "z-10 bg-[#1a4d1a] border-[#6ed62d] text-white"
																	: "bg-black/80 border-[#1a4d1a] text-[#b6f0b6] hover:bg-[#1a4d1a]/20 hover:text-[#e1f8d8] transition-all"
															} ${
																soarLoading
																	? "cursor-not-allowed opacity-50"
																	: ""
															}`}
														>
															{pageNum}
														</button>
													);
												}
												return null;
											}
										)}

										<button
											onClick={() =>
												changePage(currentPage + 1)
											}
											disabled={
												currentPage === totalPages ||
												soarLoading
											}
											className={`relative inline-flex items-center px-3 py-2 rounded-r-md border-y border-r ${
												currentPage === totalPages ||
												soarLoading
													? "border-[#333438] bg-black/50 text-[#666] cursor-not-allowed"
													: "border-[#1a4d1a] bg-black/80 text-[#b6f0b6] hover:bg-[#1a4d1a]/20 hover:border-[#b6f0b6] hover:text-[#e1f8d8] transition-all"
											}`}
										>
											<span className="sr-only">
												Next
											</span>
											<ChevronRight
												className="h-5 w-5"
												aria-hidden="true"
											/>
										</button>
									</nav>
								</div>
							</div>
						</div>

						{/* Legend */}
						<div className="mt-6 bg-black/20 p-4 rounded-md border border-[#b6f0b6]/30">
							<h3 className="text-sm font-bold text-[#e1f8d8] mb-2">
								Leaderboard Legend
							</h3>
							<div className="flex flex-wrap gap-4">
								<div className="flex items-center">
									<div className="w-3 h-3 bg-[#fbbf24] mr-2"></div>
									<span className="text-xs text-[#DDE0E3]">
										1st Place
									</span>
								</div>
								<div className="flex items-center">
									<div className="w-3 h-3 bg-[#d1d5db] mr-2"></div>
									<span className="text-xs text-[#DDE0E3]">
										2nd Place
									</span>
								</div>
								<div className="flex items-center">
									<div className="w-3 h-3 bg-[#b45309] mr-2"></div>
									<span className="text-xs text-[#DDE0E3]">
										3rd Place
									</span>
								</div>
								<div className="flex items-center">
									<div className="w-3 h-3 bg-[#1a4d1a]/20 mr-2"></div>
									<span className="text-xs text-[#DDE0E3]">
										Your Position
									</span>
								</div>
							</div>
						</div>
					</>
				) : (
					<div className="mb-8 p-4 bg-black/50 border border-[#b6f0b6]/30 rounded-lg text-center">
						<p className="text-[#DDE0E3] mb-3">
							Connect your wallet to view your stats and submit
							scores
						</p>
					</div>
				)}
			</div>
		</div>
	);
}
