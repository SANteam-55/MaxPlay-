const fs = require('fs');
let html = fs.readFileSync('public/admin.html', 'utf8');

const idx = html.lastIndexOf('</script>');
if (idx !== -1) {
  const replacement = `       } else if (tabId === 'feedback') { if (window.loadFeedback) window.loadFeedback(); }
    }; 
    window.feedbackData = []; window.currentFeedbackFilter = 'all'; 
    window.loadFeedback = async function() { 
      const tbody = document.getElementById('feedback-table-body'); 
      if (tbody) tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:40px; color:var(--text-tertiary);">Loading...</td></tr>'; 
      try { 
        const { collection, getDocs, query, orderBy } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
        const db = window.db || (await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js')).getFirestore();
        const q = query(collection(db, 'feedbacks'), orderBy('createdAt', 'desc')); 
        const snapshot = await getDocs(q); 
        const data = []; 
        snapshot.forEach(docSnap => data.push({ id: docSnap.id, ...docSnap.data() })); 
        window.feedbackData = data; window.filterFeedbackTable(); window.updateFeedbackStats(); 
      } catch(e) { console.error("Error", e); } 
    }; 
    window.updateFeedbackStats = function() { 
      const pendingCount = window.feedbackData.filter(f => f.status === 'pending').length; 
      const t1 = document.getElementById('fb-stat-total'); if(t1) t1.innerText = window.feedbackData.length; 
      const t2 = document.getElementById('fb-stat-pending'); if(t2) t2.innerText = pendingCount; 
      const t3 = document.getElementById('fb-stat-review'); if(t3) t3.innerText = window.feedbackData.filter(f => f.status === 'under_review').length; 
      const t4 = document.getElementById('fb-stat-resolved'); if(t4) t4.innerText = window.feedbackData.filter(f => f.status === 'resolved').length; 
      const b1 = document.getElementById('feedback-badge-count'); if(b1) b1.innerText = pendingCount + ' Pending'; 
      const b2 = document.getElementById('feedback-nav-badge'); if(b2) { b2.innerText = pendingCount; b2.style.display = pendingCount > 0 ? 'inline-block' : 'none'; } 
    }; 
    window.setFeedbackStatusFilter = function(status) { 
      window.currentFeedbackFilter = status; 
      document.querySelectorAll('[id^="feedback-filter-"]').forEach(btn => { btn.classList.remove('active'); btn.style.background = 'transparent'; btn.style.color = '#FFF'; btn.style.border = '1px solid rgba(255,255,255,0.1)'; }); 
      const activeBtn = document.getElementById('feedback-filter-' + status); 
      if(activeBtn) { activeBtn.classList.add('active'); activeBtn.style.background = 'linear-gradient(135deg, #06B6D4, #8B5CF6)'; activeBtn.style.border = 'none'; } 
      window.filterFeedbackTable(); 
    }; 
    window.filterFeedbackTable = function() { 
      const term = (document.getElementById('feedback-search-input')?.value || '').toLowerCase(); 
      const cat = document.getElementById('feedback-category-filter')?.value || 'ALL'; 
      const tbody = document.getElementById('feedback-table-body'); if(!tbody) return; 
      const filtered = window.feedbackData.filter(f => { 
        const mS = !term || (f.userName||'').toLowerCase().includes(term) || (f.userEmail||'').toLowerCase().includes(term) || (f.userId||'').toLowerCase().includes(term) || (f.customTopic||'').toLowerCase().includes(term) || (f.details||'').toLowerCase().includes(term); 
        const mC = cat === 'ALL' || f.category === cat; 
        const mSt = window.currentFeedbackFilter === 'all' || f.status === window.currentFeedbackFilter; 
        return mS && mC && mSt; 
      }); 
      if(filtered.length === 0) { tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:40px; color:var(--text-tertiary);">No results</td></tr>'; return; } 
      tbody.innerHTML = filtered.map(f => { 
        let sc='#A1A1AA', sb='rgba(255,255,255,0.1)', sl='Unknown'; 
        if(f.status==='pending'){sc='#FBBF24';sb='rgba(245,158,11,0.15)';sl='Pending';} 
        if(f.status==='under_review'){sc='#22D3EE';sb='rgba(6,182,212,0.15)';sl='In Review';} 
        if(f.status==='resolved'){sc='#34D399';sb='rgba(16,185,129,0.15)';sl='Resolved';} 
        if(f.status==='dismissed'){sc='#71717A';sb='rgba(255,255,255,0.05)';sl='Dismissed';} 
        return '<tr><td style="padding:14px;"><b>' + (f.userName||'U') + '</b><br><span style="font-size:10px;color:gray;">'+new Date(f.createdAt).toLocaleString()+'</span></td><td style="padding:14px;">' + (f.userId ? f.userId.substring(0,8) : 'N/A') + '</td><td style="padding:14px;">' + (f.userEmail||'N/A') + '</td><td style="padding:14px;">' + (f.categoryLabel||f.category) + (f.customTopic ? '<br><span style="font-size:10px;color:#FBBF24;">' + f.customTopic + '</span>' : '') + '</td><td style="padding:14px;"><span style="color:'+sc+';background:'+sb+';padding:2px 6px;border-radius:4px;">'+sl+'</span></td><td style="padding:14px;">' + (f.screenshots?.length>0 ? f.screenshots.length + ' imgs' : 'Text') + '</td><td style="padding:14px;"><button type="button" class="btn-primary" onclick="window.openFeedbackDetailModal(\\'' + f.id + '\\')">Review</button></td></tr>'; 
      }).join(''); 
    }; 
    window.currentFeedbackTicket = null; 
    window.openFeedbackDetailModal = function(id) { 
      const tk = window.feedbackData.find(x => x.id === id); if(!tk) return; 
      window.currentFeedbackTicket = tk; 
      document.getElementById('fb-modal-ticket-id').innerText = '#' + id.substring(0,8).toUpperCase(); 
      document.getElementById('fb-modal-date').innerText = new Date(tk.createdAt).toLocaleString(); 
      document.getElementById('fb-modal-user-name').innerText = tk.userName||'U'; 
      document.getElementById('fb-modal-user-email').innerText = tk.userEmail||'N/A'; 
      document.getElementById('fb-modal-user-uid').innerText = tk.userId||'N/A'; 
      document.getElementById('fb-modal-category-badge').innerText = tk.categoryLabel||tk.category; 
      document.getElementById('fb-modal-telemetry-meta').innerText = tk.deviceInfo||'Unknown'; 
      document.getElementById('fb-modal-custom-topic-box').style.display = tk.customTopic ? 'block' : 'none';
      if(tk.customTopic) document.getElementById('fb-modal-custom-topic-text').innerText = tk.customTopic;
      document.getElementById('fb-modal-details-text').innerText = tk.details||''; 
      document.getElementById('fb-modal-status-select').value = tk.status||'pending'; 
      document.getElementById('fb-modal-reply-body').value = tk.adminReply||''; 
      const sg = document.getElementById('fb-modal-screenshots-grid'); 
      if(tk.screenshots?.length > 0) { 
        document.getElementById('fb-modal-screenshots-section').style.display='block'; 
        sg.innerHTML = tk.screenshots.map(s => '<img src="' + s + '" style="width:100%;aspect-ratio:16/9;object-fit:cover;cursor:pointer;" onclick="window.openFeedbackScreenshotLightbox(\\'' + s + '\\')">').join(''); 
      } else { 
        document.getElementById('fb-modal-screenshots-section').style.display='none'; 
      } 
      document.getElementById('feedback-detail-modal').style.display = 'flex'; 
    }; 
    window.closeFeedbackDetailModal = function() { document.getElementById('feedback-detail-modal').style.display = 'none'; }; 
    window.openFeedbackScreenshotLightbox = function(s) { document.getElementById('lightbox-img-element').src = s; document.getElementById('lightbox-open-newtab').href = s; document.getElementById('feedback-screenshot-lightbox').style.display = 'flex'; }; 
    window.closeFeedbackScreenshotLightbox = function() { document.getElementById('feedback-screenshot-lightbox').style.display = 'none'; }; 
    window.applyFeedbackTemplate = function(k) { 
      const r = document.getElementById('fb-modal-reply-body'); 
      const s = document.getElementById('fb-modal-status-select'); 
      if(k==='resolved'){ r.value='Fixed! Thanks!'; s.value='resolved'; } 
      else if(k==='investigating'){ r.value='Investigating now.'; s.value='under_review'; } 
      else if(k==='feature_logged'){ r.value='Feature request logged.'; s.value='resolved'; }
      else if(k==='more_info'){ r.value='Need more info.'; s.value='under_review'; } 
    }; 
    window.saveFeedbackTicketResolution = async function() { 
      if(!window.currentFeedbackTicket) return; 
      const id = window.currentFeedbackTicket.id; 
      const s = document.getElementById('fb-modal-status-select').value; 
      const r = document.getElementById('fb-modal-reply-body').value.trim(); 
      const snd = document.getElementById('fb-modal-send-inbox-notification').checked; 
      try { 
        const { updateDoc, doc, addDoc, collection } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
        const db = window.db || (await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js')).getFirestore();
        const d = { status: s, updatedAt: new Date().toISOString() }; 
        if(r) { d.adminReply = r; d.adminReplyDate = new Date().toISOString(); d.adminReplySubject = "Response to your feedback: " + (window.currentFeedbackTicket.categoryLabel || 'Support Ticket'); } 
        await updateDoc(doc(db, 'feedbacks', id), d); 
        if(snd && r && window.currentFeedbackTicket.userId) { 
          await addDoc(collection(db, 'systemMessages'), { userId: window.currentFeedbackTicket.userId, title: "Support Ticket Update", message: r, type: 'support_reply', priority: 'normal', createdAt: new Date().toISOString(), isUnread: true }); 
        } 
        if(window.showToast) window.showToast('Updated'); 
        window.closeFeedbackDetailModal(); 
        window.loadFeedback(); 
      } catch(e) { console.error(e); } 
    }; 
    window.deleteCurrentFeedbackTicket = async function() { 
      if(!window.currentFeedbackTicket) return; 
      if(!confirm('Delete?')) return; 
      try { 
        const { deleteDoc, doc } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
        const db = window.db || (await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js')).getFirestore();
        await deleteDoc(doc(db, 'feedbacks', window.currentFeedbackTicket.id)); 
        window.closeFeedbackDetailModal(); window.loadFeedback(); 
      } catch(e) {} 
    }; 
    window.openDirectMessageModal = function(u,n,e) { 
      document.getElementById('dm-target-uid').value = u||''; 
      document.getElementById('dm-recipient-info').value = n ? n + ' (' + (e||'') + ')' : ''; 
      document.getElementById('dm-msg-title').value = 'Support Update'; 
      document.getElementById('dm-msg-body').value = ''; 
      document.getElementById('direct-message-user-modal').style.display = 'flex'; 
    }; 
    window.closeDirectMessageModal = function() { document.getElementById('direct-message-user-modal').style.display = 'none'; }; 
    window.sendDirectMessageToUser = async function() { 
      const u = document.getElementById('dm-target-uid').value.trim(); 
      const t = document.getElementById('dm-msg-title').value.trim(); 
      const b = document.getElementById('dm-msg-body').value.trim(); 
      if(!u || !b) return; 
      try { 
        const { addDoc, collection } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
        const db = window.db || (await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js')).getFirestore();
        await addDoc(collection(db, 'systemMessages'), { userId: u, title: t||'Admin Message', message: b, type: 'support_reply', priority: 'normal', createdAt: new Date().toISOString(), isUnread: true }); 
        window.closeDirectMessageModal(); 
        if(window.showToast) window.showToast('Sent!'); 
      } catch(e) {} 
    }; 
  </script>`;
  html = html.substring(0, idx) + replacement + html.substring(idx + 9);
  fs.writeFileSync('public/admin.html', html);
  console.log("Patched successfully!");
} else {
  console.log("Target not found!");
}
