


import { getUserData, UserData } from '@decentraland/Identity'
import { getCurrentRealm, Realm } from '@decentraland/EnvironmentAPI'
import * as EthereumController from '@decentraland/EthereumController'

import * as ui from '@dcl/ui-scene-utils'
import {Utils} from "src/utils"


export let ethController = EthereumController

export let fireBaseServer =
  'https://tensaistudio.xyz/poap/'

export let userData: UserData
export let playerRealm: Realm

export async function fetchUserData() {
  const data = await getUserData()
  log(data.displayName)
  return data
}

export async function setUserData() {
  const data = await getUserData()
  log(data.displayName)
  userData = data
}

// fetch the player's realm
export async function setRealm() {
  let realm = await getCurrentRealm()
  log(`You are in the realm: ${JSON.stringify(realm.displayName)}`)
  playerRealm = realm
}

export async function handlePoap(eventName: string) {

  


  if (!userData) {
    await setUserData()
  }

  if (!playerRealm) {
    await setRealm()
  }

  if (userData.hasConnectedWeb3) {
    
    let poap = await sendpoap(eventName)
    
    if (poap.qr_hash != null && poap.qr_hash != "" ) {
      
      let prompt_instruction = "Please claim your POAP\nin the claim page.\n(Press Esc to use mouse)";
      let prompt_but_label = "Claim";

      if ( poap.success == false ) {
        prompt_instruction = "You have already acquired\nthis POAP previously\n(Press Esc to use mouse)";
        prompt_but_label = "Show Me";
      }

      let p = new ui.CustomPrompt(ui.PromptStyles.DARK);
      p.addText( prompt_instruction , 0, 100, Color4.White(), 24)
      let button1 = p.addButton(
        prompt_but_label,
        0,
        -30,
        () => {
          openExternalURL("http://poap.xyz/claim/"+ poap.qr_hash)
          p.hide()
        },
        ui.ButtonStyles.RED
      )
        
    } else {
      let text = 'Something is wrong with the server, please try again later.'
      if (poap.error) {
        text = poap.error
      }
      let p = new ui.OkPrompt(
        text,
        () => {
          p.close()
        },
        'Ok',
        true
      )
    }
  } else {
    let p = new ui.OkPrompt(
      'You need an in-browser Ethereum wallet (eg: Metamask) to claim this item.',
      () => {
        p.close()
      },
      'Ok',
      true
    )
  }
}

export async function sendpoap(eventName: string) {
  //if (TESTDATA_ENABLED && IN_PREVIEW) {
  // return
  //}

  if (!userData) {
    await setUserData()
  }
  if (!playerRealm) {
    await setRealm()
  }

  const url = fireBaseServer + 'send-poap2.rvt'

  let body = JSON.stringify({
    id: userData.userId,
    stage: eventName,
    server: playerRealm.serverName,
    realm: playerRealm.layer,
    event_id: eventName,
    username: userData.displayName,
    sig: Utils.sha256(userData.userId + "wibble" + eventName )

  })


  log('sending req to: ', url)
  try {
    let response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body,
    })
    let data = await response.json()
    log('Poap status: ', data)



    return data
  } catch {
    log('error fetching from token server ', url)
  }
}
