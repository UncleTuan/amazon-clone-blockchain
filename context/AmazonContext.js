import { createContext, useState, useEffect } from 'react'
import { useMoralis, useMoralisQuery } from 'react-moralis'
import { amazonAbi, amazonCoinAddress } from '../lib/constants'
import { ethers } from 'ethers'

export const AmazonContext = createContext()

export const AmazonProvider = ({ children }) => {
    const [username, setUsername] = useState ('')
    const [nickname, setNickname] = useState ('')
    const [assets, setAssets] = useState([])
    const [currentAccount, setCurrentAccount] = useState('')
    const [tokenAmount, setTokenAmount] = useState('')
    const [amountDue, setAmountDue] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [etherscanLink, setEtherscanLink] = useState('')
    const [balance, setBalance] = useState('')
    const [recentTransactions, setRecentTransactions] = useState([])

    const {
        authenticate,
        isAuthenticated,
        enableWeb3,
        Moralis,
        user,
        isWeb3Enabled,
      } = useMoralis()
    
    const {
        data: assetsData,
        error: assetsDataError,
        isLoading: userDataisLoading,
    } = useMoralisQuery('assets')

    const {
      data: userData,
      error: userDataError,
      isLoading: userDataIsLoading,
    } = useMoralisQuery('_User')

    useEffect(()=>{
        ;(async()=>{
            if(isAuthenticated){
                await getBalance()
                await listenToUpdates()
                const currentUsername = await user?.get('nickname')
                setUsername(currentUsername)
                const account = await user?.get('ethAddress')
                setCurrentAccount(account)
            }
        })()
    }, [isAuthenticated, user, username, currentAccount])

    useEffect(()=>{
        ;(async()=>{
            if(isWeb3Enabled) {
                await getAssets()
            }
        })()
    },[isWeb3Enabled, assetsData, userDataisLoading])

    const handleSetUsername = () => {
        if(user){
            if(nickname){
                user.set('nickname',nickname)
                user.save()
                setNickname('')
            }else {
                console.log("Can't set empty nickname")
            }
        }else{
            console.log('No user')
        }
    }

    const listenToUpdates = async () => {
      let query = new Moralis.Query('EthTransactions')
      let subscription = await query.subscribe()
      subscription.on('update', async object => {
        console.log('New Transactions')
        console.log(object)
        setRecentTransactions([object])
      })
    }  

    const getBalance = async () => {
        try {
          if (!isAuthenticated || !currentAccount) return
          const options = {
            contractAddress: amazonCoinAddress,
            functionName: 'balanceOf',
            abi: amazonAbi,
            params: {
              account: currentAccount,
            },
          }
    
          if (isWeb3Enabled) {
            const response = await Moralis.executeFunction(options)
            setBalance(response.toString())
          }
        } catch (error) {
          console.log(error)
        }
      }

      const buyAsset = async (price, asset) => {
        try {
          if (!isAuthenticated) return
          
    
          const options = {
            type: 'erc20',
            amount: price,
            receiver: amazonCoinAddress,
            contractAddress: amazonCoinAddress,
          }
    
          let transaction = await Moralis.transfer(options)
          const receipt = await transaction.wait()
    
          if (receipt) {
            console.log("WAITING FOR RECEIPT")
            const res = userData[0].add('ownedAssets', {
              ...asset,
              purchaseDate: Date.now(),
              etherscanLink: `https://rinkeby.etherscan.io/tx/${receipt.transactionHash}`,
            })
            await res.save().then(() => {
              alert("You've successfully purchased this asset!")
            })
          }
        } catch (error) {
          console.log(error.message)
        }
      }


      const buyTokens = async () => {
        if (!isAuthenticated) {
          await connectWallet()
        }
    
        const amount = ethers.BigNumber.from(tokenAmount)
        const price = ethers.BigNumber.from('100000000000000')
        const calcPrice = amount.mul(price)
    
    
        let options = {
          contractAddress: amazonCoinAddress,
          functionName: 'mint',
          abi: amazonAbi,
          msgValue: calcPrice,
          params: {
            amount,
          },
        }
        const transaction = await Moralis.executeFunction(options)
        const receipt = await transaction.wait()
        setIsLoading(false)
        console.log(receipt)
        setEtherscanLink(
          `https://rinkeby.etherscan.io/tx/${receipt.transactionHash}`,
        )
      }

    

    const getAssets = async () => {
        try{
            await enableWeb3
            setAssets(assetsData)
        }catch(error){
            console.log(error)
        }
    }

        return(
            <AmazonContext.Provider
                value={{
                    isAuthenticated,
                    nickname,
                    setNickname,
                    username,
                    handleSetUsername,
                    assets,
                    balance,
                    setTokenAmount,
                    tokenAmount,
                    amountDue,
                    setAmountDue,
                    isLoading,
                    setIsLoading,
                    setEtherscanLink,
                    etherscanLink,
                    currentAccount,
                    buyTokens,
                    buyAsset,
                    recentTransactions
                }}
            >
                {children}
            </AmazonContext.Provider>
        )
}