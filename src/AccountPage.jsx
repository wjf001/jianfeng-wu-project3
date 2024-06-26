import axios from 'axios'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router';
import './AccountPage.css';
import Footer from './Footer';
import './AccountPage.css';
import LoggedInNavBar from './LoggedInNavBar';
import './Login.css';

function AccountPage() {
  const  navigate = useNavigate();

  const [accountListState, setAccountListState] = useState([]);
  const [accountAddressState, setAccountAddressState] = useState('');
  const [accountPasswordState, setAccountPasswordState] = useState('');
  const [editingState, setEditingState] = useState({
    isEditing: false,
    editingAccountId: '',
  });
  const [errorMsgState, setErrorMsgState] = useState('');
  const [isRequestSent, setIsRequestSent] = useState(false);
  const [username, setUsername] = useState('');

  const [includeAlphabet, setIncludeAlphabet] = useState(false);
  const [includeNumerals, setIncludeNumerals] = useState(false);
  const [includeSymbols, setIncludeSymbols] = useState(false);
  const [passwordLength, setPasswordLength] = useState(8); // Default length

  const [shareUsername, setShareUsername] = useState('');  // For sharing passwords

  const [searchDomain, setSearchDomain] = useState('');

  async function getAllAccount() {
    const response = await axios.get('/api/account');
    setAccountListState(response.data);
  }

  async function deleteAccount(accountId) {
    await axios.delete('/api/account/' + accountId);
    await getAllAccount();
  }

  async function onSubmit() {
    setErrorMsgState('');
    try {
        let charset = [
            includeAlphabet ? 'alphabet' : '',
            includeNumerals ? 'numerals' : '',
            includeSymbols ? 'symbols' : ''
            ].filter(Boolean).join(',');

        const payload = {
          siteAddress: accountAddressState,
          password: accountPasswordState,
          charset: charset,
          length: passwordLength
        };

        if (editingState.isEditing) {
            await axios.put(`/api/account/${editingState.editingAccountId}`, payload);
        } else {
            await axios.post('/api/account', payload);
        }

        resetForm();
        await getAllAccount();
      } catch (error) {
        if (error.response) {
          setErrorMsgState(error.response.data ? error.response.data: "error");
        } else {
          setErrorMsgState("error");
        }
      }
    }

  function resetForm() {
    setAccountAddressState('');
    setAccountPasswordState('');
    setIncludeAlphabet(false);
    setIncludeNumerals(false);
    setIncludeSymbols(false);
    setPasswordLength(8);
    setEditingState({ isEditing: false, editingAccountId: '' });
  }

  function updateAccountPassword(event) {
    setAccountPasswordState(event.target.value);
  }

  function updateAccountAddress(event) {
    setAccountAddressState(event.target.value);
  }

  function setEditingAccount(siteAddress, password, accountId) {
    setAccountAddressState(siteAddress);
    setAccountPasswordState(password);
    setEditingState({
        isEditing: true, 
        editingAccountId: accountId
    });
  }

  function onCancel() {
    setAccountAddressState('');
    setAccountPasswordState('');
    setEditingState({
      isEditing: false, 
      editingAccountId: '',
  });
  }

  async function isLoggedIn() {
    try {
      const response = await axios.get('/api/users/loggedIn');
      const username = response.data.username;
      setUsername(username);
    } catch (e) {
      navigate('/')
    }
  }

  useEffect(() => {
    isLoggedIn().then(() => {
      getAllAccount();
      // fetchShareRequests();
    });
    setIsRequestSent(false);
  }, []);

  function copyText(index) {
    navigator.clipboard.writeText(accountListState[index].password);
  }

  const hasSharedSite = () => {
    console.log(accountListState.length);
    for (let i = 0; i < accountListState.length; i++) {
      console.log(accountListState[i])
      if (accountListState[i].isShared) {
        return accountListState[i].originalOwner;
      }
    }

    return false;
  }

  const accountListElement = () => {
    const originalOwner = hasSharedSite();
    console.log(originalOwner);
    if (!!originalOwner) {
      return (
        <>
          {originalOwner} requests to share their passowrds with you, do you want to accept it?
          <button className='account-item' onClick={onClickAccept(originalOwner)}>Accept</button>
          <button className='account-item' onClick={onClickReject}>Reject</button>
        </>
      )
    }
    return accountListState.map((account, index) => (
      <li key={account._id} className="account-item">
        <input type="checkbox"  className='account-checkbox'/>
        <div className="account-info">
          <div className='account-site'>Site: {account.siteAddress}</div>
          <div className='account-password'>Password: {account.password}</div>
          User: {account.originalOwner}
        </div>
        <div className="account-last-used">
          Last Used: {account.created}
        </div>
        {
          account.owner === account.originalOwner ? (
            <div className="account-actions">
              <button onClick={() => deleteAccount(account._id)}>Delete</button>
              <button onClick={() => setEditingAccount(account.siteAddress, account.password, account._id)}>Edit</button>
              <button onClick={() => copyText(index)}>Copy password</button>
            </div>
          ) : (<></>)
        }
      </li>
    ));
  }

  const inputFieldTitleText = editingState.isEditing ? "Edit Account" : "Add new Account";

  if(!username) {
    return <div>Loading...</div>
  }

  async function handleShareRequest() {
    try {
      const response = await axios.post('/api/account/shareRequest', { toUsername: shareUsername });
      setShareUsername('');
      setIsRequestSent(true);
    } catch (error) {
      setErrorMsgState('Failed to send share request: ' + (error.response ? error.response.data : 'Network error'));
    }
  }

  function searchPassword(event) {
    event.preventDefault();

    let domain = document.getElementById('textInput').value;
    
    for (let i = 0; i < accountListState.length; i++) {
      if (accountListState[i].siteAddress === domain) {
        setSearchDomain(accountListState[i].password);
        return;
      }
    }

    setSearchDomain('');
  }

  const onClickAccept = (requestedUser) => async (event) => {
    event.preventDefault();

    console.log(requestedUser);
    await axios.post('/api/account/acceptsharingrequest', {
      requestedUser,
      acceptedUser: username
    });

    console.log(accountListState.length);
    const newAccountListState = [];
    for (let i = 0; i < accountListState.length; i++) {
      newAccountListState.push({
        ...accountListState[i],
        isShared: false
      });
    }

    setAccountListState(newAccountListState);

  }

  async function onClickReject(event) {
    event.preventDefault();

    await axios.post('/api/account/rejectsharingrequest', {
    });

    console.log(accountListState.length);
    const newAccountListState = [];
    for (let i = 0; i < accountListState.length; i++) {
      if (!accountListState[i].isShared) {
        newAccountListState.push({
          ...accountListState[i],
          isShared: false
        });
      }
    }

    setAccountListState(newAccountListState);
  }



  return (
    <>
      <LoggedInNavBar username={username}/>
      <div className="account-container">
        <div className="account-header">
          <h1>Hi, {username}! Here're your passwords.</h1>
        </div>

        <div className='search-container'>
          <form id="searchForm" onSubmit={searchPassword} className='search-form'>
              <input type="text" id="textInput" placeholder='search by domain'/>
              <button type="submit" className="search-btn">Search</button>
              {searchDomain && (
                <div className="search-result">
                  <input type="text" value={searchDomain} readOnly className="search-answer" />
                  <button onClick={() => navigator.clipboard.writeText(searchDomain)} className="copy-btn">Copy</button>
                </div>
              )}
          </form>
        </div>

        <ul className="account-list">
          {accountListElement()}
        </ul>

        <div className="account-form">
          <h2>{inputFieldTitleText}</h2>
          <div className="form-group">
            <label>Site Name:</label>
            <input type="text" value={accountAddressState} onInput={(event) => updateAccountAddress(event)} />
            {errorMsgState && <p className="error-message">{errorMsgState}</p>}

          </div>

          <div className="form-group">
            <label>Password:</label>
            <input type="password" value={accountPasswordState} onInput={(event) => updateAccountPassword(event)} />
          </div>
          
          <div className="form-group">
            <label>Password Length:</label>
            <input type="number" value={passwordLength} onChange={e => setPasswordLength(parseInt(e.target.value, 10))} min="4" max="50" />
          </div>

          <div className="form-group">
            <div className="checkbox-group">
              <label>
                <input type="checkbox" checked={includeAlphabet} onChange={e => setIncludeAlphabet(e.target.checked)} />
                Alphabet
              </label>
              <label>
                <input type="checkbox" checked={includeNumerals} onChange={e => setIncludeNumerals(e.target.checked)} />
                Numerals
              </label>
              <label>
                <input type="checkbox" checked={includeSymbols} onChange={e => setIncludeSymbols(e.target.checked)} />
                Symbols
              </label>
            </div>
          </div>

          <div>
            <button onClick={() => onSubmit()}>Submit</button>
            <button onClick={() => onCancel()}>Cancel</button>
          </div>
        </div>

          <div className="share-form">
            <input
              type="text"
              placeholder="Username to share with"
              value={shareUsername}
              onChange={(e) => setShareUsername(e.target.value)}
            />
            <button onClick={handleShareRequest}>Share Passwords</button>
            {isRequestSent ? '   Request Successfully Sent!' : ''}
          </div>
      </div>
      <Footer />

      
    </>
  );
}

export default AccountPage;
