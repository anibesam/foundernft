// SPDX-License-Identifier: GPL-3.0//
pragma solidity 0.8.4;

/// @title FounderNft ///
/// @author Anibe Samuel ///

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "hardhat/console.sol";

/*
  ______                    _           _   _  __ _   
 |  ____|                  | |         | \ | |/ _| |  
 | |__ ___  _   _ _ __   __| | ___ _ __|  \| | |_| |_ 
 |  __/ _ \| | | | '_ \ / _` |/ _ \ '__| . ` |  _| __|
 | | | (_) | |_| | | | | (_| |  __/ |  | |\  | | | |_ 
 |_|  \___/ \__,_|_| |_|\__,_|\___|_|  |_| \_|_|  \__|
                                                                                                          
*/


contract FounderNft is Ownable, ERC721URIStorage {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    /// @notice cost: Amount to play for minting a nft//
    uint256 public constant COST = 0.069 ether;
    /// @notice maxSupply: Total number of minitable NFTs ///
    uint256 public constant MAX_SUPPLY = 5;
    /// @notice maxMint: Amount of NFTs a single wallet can mint//
    uint256 public constant MAX_MINT = 5;
    /// @notice max mint batch: Maximum tokens that owner can mint in a batch//
    uint256 public constant MAX_MINT_BATCH = 100;
    /// @notice maxMintPerSession:  Amount of NFT's that can be minted per session as this contract allows bulk minting ///
    uint256 public constant MAX_MINT_PER_SESSION = 5;
    /// @notice paused: State of contract. If paused, no new NFTs can be minted.///
    bool public paused = false;
    // base uri//
    string constant BASE_URI =
        "ipfs://QmfFDhfsDYi3Kcob4Sn4vBNoVSfMBPugHXF56PwQ7PPXx8";
    /// @notice tokenMintedByAddress: Keeps a track of number of tokens limted by an address ///
    /// @dev this structure sits perfectly between uitlity and complexity to make sure that no wallet address can mint more than 5 tokens///
    mapping(address => uint256) public tokenMintedByAddress;

    constructor() ERC721("FounderNft", "FNDR") {}

    event Withdraw(address _to, uint256 _value);

    /// @dev : this works as a wrapper to handle the call if function is calledd with an argument//
    function mint() external payable {
        mint(1);
    }

    /// @dev mint: mint an NFT if the following conditions are met ///
    /// 1. Contract is not paused ///
    /// 2. Check if the current mint is not more than maxMint.
    /// 3. Anount of ether sent is correct ///
    /// 4. "numberOfTokens" is not more than max allowed to ming per session ///
    /// 5. Calling address won't have more than max allowed to mint per wallet including the triggerd mint ///
    /// @param _numberOfTokens: Amount of tokens to mints as we allow bulk mintiing ///
    function mint(uint256 _numberOfTokens) public payable {
        require(paused == false, "Contract is paused");
        require(MAX_SUPPLY > _tokenIds.current(), "Max supply reached");
        require(
            MAX_MINT_PER_SESSION >= _numberOfTokens,
            "You can not mint more than 5 tokens per session"
        );
        require(
            MAX_MINT >= (tokenMintedByAddress[msg.sender] + _numberOfTokens),
            "A wallet can not mint more than 5 tokens"
        );
        //check if amount of ether sent is correct//
        require(msg.value >= (_numberOfTokens * COST), "Insufficient funds");
        // Update state tokenMintedByAddress //
        tokenMintedByAddress[msg.sender] += _numberOfTokens;
        for (uint256 i = 0; i < _numberOfTokens; i++) {
            _tokenIds.increment(); // increment counter state
            uint256 tokenId = _tokenIds.current(); // get current state of counter for token id//
            //prepare tokenURI//
            string memory id = Strings.toString(_tokenIds.current());
            string memory tURI = string(abi.encodePacked(BASE_URI, "/", id));
            _safeMint(msg.sender, tokenId);
            _setTokenURI(tokenId, tURI);
        }
    }

    function pause() external onlyOwner returns (bool) {
        paused = true;
        return paused;
    }

    function resume() external onlyOwner returns (bool) {
        paused = false;
        return paused;
    }

    function totalSupply() public view returns (uint256) {
        return _tokenIds.current();
    }

    function withdrawFunds() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No ether left to withdraw");
        (bool success, ) = (msg.sender).call{value: balance}("");
        require(success, "Withdrawal Failed");
        emit Withdraw(msg.sender, balance);
    }

    // this function is meant to be used by owner to mint a batch of tokens for airdrops, team-members, etc. This method allow owner to mint the token without paying the cost as well///
    function mintBatch(uint256 _numberOfTokens) external onlyOwner {
        require(paused == false, "Contract is paused");
        require(MAX_SUPPLY > _tokenIds.current(), "Max supply reached");
        require(
            MAX_MINT_BATCH >= _numberOfTokens,
            "You can only mint 100 tokens in one batch"
        );
        // Update state tokenMintedByAddress //
        tokenMintedByAddress[msg.sender] += _numberOfTokens;
        for (uint256 i = 0; i < _numberOfTokens; i++) {
            _tokenIds.increment(); // increment counter state
            uint256 tokenId = _tokenIds.current(); // get current state of counter for token id//
            //prepare tokenURI//
            string memory id = Strings.toString(_tokenIds.current());
            string memory tURI = string(abi.encodePacked(BASE_URI, "/", id));
            _safeMint(msg.sender, tokenId);
            _setTokenURI(tokenId, tURI);
        }
    }
}